//var tools = require('./utils');

// Ethers
function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

// Latest time
function latestTime() {
  return web3.eth.getBlock('latest').timestamp;
}

const EVMRevert = 'revert';

// Advances the block number so that the last mined block is `number`
function advanceBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: Date.now(),
    }, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

// Increase time

function increaseTime(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

function increaseTimeTo(target) {
  let now = latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

const duration = {
  seconds: function(val) {
    return val;
  },
  minutes: function(val) {
    return val * this.seconds(60);
  },
  hours: function(val) {
    return val * this.minutes(60);
  },
  days: function(val) {
    return val * this.hours(24);
  },
  weeks: function(val) {
    return val * this.days(7);
  },
  years: function(val) {
    return val * this.days(365);
  },
};

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();


const HiveList = artifacts.require('HiveList');
const MeterList = artifacts.require('MeterList');
const StableToken = artifacts.require('StableToken');
const TokenVault = artifacts.require('TokenVault');


contract('TokenVault', function([_, worker, queen, hive, hive_owner]) {
  const TARIFF_NAME = ['high', 'low', 'sell'];
  const TARIFF_TYPE = [0, 0, 1];
  const PRICE = [1000, 500, 400];

  const METER_ADDRESS = ['0x2460000000000000000000000000000000000000', '0x4560000000000000000000000000000000000000'];
  const HIVE_ADDRESS_DEPLOY = ['0x0120000000000000000000000000000000000000', '0x0456000000000000000000000000000000000000'];
  const WALLET_USER = [worker, queen];
  const CURRENT_RATING = [16000, 32000];
  const METER_TYPE = [0, 1];
  const DESCRIPTION = ['test meter 1', 'test meter 2'];

  const WORKER_INITIAL_TOKENS = 1e6;
  const QUEEN_INITIAL_TOKENS = 2e6;

  var events;

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  // Create the tariff object
  beforeEach(async function() {
    this.hiveList = await HiveList.new();
    this.meterList = await MeterList.new(
      METER_ADDRESS,
      HIVE_ADDRESS_DEPLOY,
      WALLET_USER,
      CURRENT_RATING,
      METER_TYPE,
      DESCRIPTION
    );
    this.stableToken = await StableToken.new();
    this.tokenVault = await TokenVault.new(this.hiveList.address, this.meterList.address, this.stableToken.address);
    // distribute tokens
    await this.stableToken.transfer(worker, WORKER_INITIAL_TOKENS);
    await this.stableToken.transfer(queen, QUEEN_INITIAL_TOKENS);

    //create a hive
    await this.hiveList.addHive(hive, hive_owner);

    //assign meters to hive in meterList
    await this.meterList.assignMetersToHive(METER_ADDRESS, hive);


    events = this.tokenVault.allEvents({
      fromBlock: 0,
      toBlock: 'latest'
    });
    events.watch(function(error, result) {
      if (!error)
        console.log('-- captured event: ' + result.event);
    });

  });

  afterEach(async function() {
    events.stopWatching();
  });


  describe('Initial tests:', function() {
    it('should create tokenVault, distribute tokens to worker and queen, create hive and assign meters to hive', async function() {
      this.stableToken.should.exist;
      (await this.stableToken.balanceOf(worker)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS);
      (await this.stableToken.balanceOf(queen)).should.be.bignumber.equal(QUEEN_INITIAL_TOKENS);
      (await this.meterList.getMeterUser(METER_ADDRESS[0])).should.be.equal(worker);
      (await this.meterList.getMeterHive(METER_ADDRESS[0])).should.be.equal(hive);
    });
  });

  describe('Deposits:', function() {
    const HST_TO_DEPOSIT = 1000;
    it('successfull deposit', async function() {
      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: worker
      });
      await this.tokenVault.deposit(METER_ADDRESS[0], hive, {
        from: worker
      });
      (await this.tokenVault.balanceOf(METER_ADDRESS[0])).should.be.bignumber.equal(HST_TO_DEPOSIT);
      (await this.stableToken.balanceOf(worker)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS - HST_TO_DEPOSIT);
    });

    it('unsuccessfull deposit', async function() {
      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: worker
      });
      await this.tokenVault.deposit(METER_ADDRESS[0], HIVE_ADDRESS_DEPLOY[0], {
        from: worker
      }).should.be.rejectedWith(EVMRevert);

      (await this.tokenVault.balanceOf(METER_ADDRESS[0])).should.be.bignumber.equal(0);
      (await this.stableToken.balanceOf(worker)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS);
      (await this.stableToken.allowance(worker, this.tokenVault.address)).should.be.bignumber.equal(HST_TO_DEPOSIT);
      await this.tokenVault.cancelDeposit({
        from: worker
      });
      (await this.stableToken.allowance(worker, this.tokenVault.address)).should.be.zero;
    });

    it('successfull withdraw', async function() {
      const HST_TO_TRANSFER = 100;
      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: worker
      });
      await this.tokenVault.deposit(METER_ADDRESS[0], hive, {
        from: worker
      });
      (await this.tokenVault.balanceOf(METER_ADDRESS[0])).should.be.bignumber.equal(HST_TO_DEPOSIT);
      (await this.stableToken.balanceOf(worker)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS - HST_TO_DEPOSIT);

      await this.tokenVault.withdraw(METER_ADDRESS[0], METER_ADDRESS[1], HST_TO_TRANSFER, {
        from: hive
      });
      (await this.stableToken.balanceOf(queen)).should.be.bignumber.equal(QUEEN_INITIAL_TOKENS + HST_TO_TRANSFER);
    });

    it('unsuccessfull withdraw', async function() {
      const HST_TO_TRANSFER = 100;
      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: worker
      });
      await this.tokenVault.deposit(METER_ADDRESS[0], hive, {
        from: worker
      });
      (await this.tokenVault.balanceOf(METER_ADDRESS[0])).should.be.bignumber.equal(HST_TO_DEPOSIT);
      (await this.stableToken.balanceOf(worker)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS - HST_TO_DEPOSIT);

      await this.tokenVault.withdraw(METER_ADDRESS[0], METER_ADDRESS[1], HST_TO_TRANSFER, {
        from: hive_owner
      }).should.be.rejectedWith(EVMRevert);
    });
  });
});
