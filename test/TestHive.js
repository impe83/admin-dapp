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
const Hive = artifacts.require('Hive');
const MeterList = artifacts.require('MeterList');
const StableToken = artifacts.require('StableToken');
const TokenVault = artifacts.require('TokenVault');
const DateTime = artifacts.require('../third-party/ethereum-datetime/contracts/DateTime.sol');
const Tariff = artifacts.require('Tariff');


contract('Hive', function([_, meter_owner, queen, tariff_owner, hive_owner, meter]) {
  const TARIFF_NAME = ['high', 'low', 'sell'];
  const TARIFF_TYPE = [0, 0, 1];
  const PRICE = [1000, 500, 400];

  const METER_ADDRESS = [meter, '0x4560000000000000000000000000000000000000'];
  const HIVE_ADDRESS_DEPLOY = ['0x0120000000000000000000000000000000000000', '0x0456000000000000000000000000000000000000'];
  const WALLET_USER = [meter_owner, queen];
  const CURRENT_RATING = [16000, 32000];
  const METER_TYPE = [0, 1];
  const DESCRIPTION = ['test meter 1', 'test meter 2'];

  const WORKER_INITIAL_TOKENS = 1e6;
  const QUEEN_INITIAL_TOKENS = 2e6;
  const HIVE_OWNER_INITIAL_TOKENS = 2e6;

  var events;

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function() {
    this.timeout(1500000);
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
    this.dateTime = await DateTime.new();

    // distribute tokens
    await this.stableToken.transfer(meter_owner, WORKER_INITIAL_TOKENS);
    await this.stableToken.transfer(queen, QUEEN_INITIAL_TOKENS);
    await this.stableToken.transfer(hive_owner, HIVE_OWNER_INITIAL_TOKENS);

    //create tariff
    this.tariff = await Tariff.new(
      tariff_owner,
      TARIFF_NAME,
      TARIFF_TYPE,
      PRICE
    );

    //create a hive
    this.hive = await Hive.new(this.tokenVault.address, this.tariff.address, this.dateTime.address, this.meterList.address, this.hiveList.address);
    //add it to list
    await this.hiveList.addHive(this.hive.address, hive_owner);

    //assign meters to hive in meterList
    await this.meterList.assignMetersToHive(METER_ADDRESS, this.hive.address);
    //add them to hive
    this.hive.addMeters(METER_ADDRESS);

  });

  describe('Initial tests:', function() {
    this.timeout(1500000);
    it('should create tokenVault, distribute tokens to meter_owner and queen, create hive and assign meters to hive', async function() {
      this.stableToken.should.exist;
      (await this.stableToken.balanceOf(meter_owner)).should.be.bignumber.equal(WORKER_INITIAL_TOKENS);
      (await this.stableToken.balanceOf(queen)).should.be.bignumber.equal(QUEEN_INITIAL_TOKENS);
      (await this.meterList.getMeterUser(METER_ADDRESS[0])).should.be.equal(meter_owner);
      (await this.meterList.getMeterHive(METER_ADDRESS[0])).should.be.equal(this.hive.address);
    });
  });

  describe('Test views:', function() {
    this.timeout(1500000);
    it('Get slots', async function() {
      var d = new Date();
      var currentSlot = d.getFullYear() * 12.0 + d.getMonth() + 1;
      (await this.hive.getCurrentSlot()).should.be.bignumber.equal(currentSlot);
      (await this.hive.getLastSlot()).should.be.bignumber.equal(currentSlot - 1);
      var meters = await this.hive.getMeters();
      for (var i = 0; i < meters.length; i++) {
        meters[i].should.be.equal(METER_ADDRESS[i]);
      }
    });
  });

  describe('Test payments:', function() {
    this.timeout(1500000);
    it('Send energy from meter and pay', async function() {
      const HST_TO_DEPOSIT = 100000;
      const ENERGY_FLOWS = [1, 1, 1];
      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: meter_owner
      });
      await this.tokenVault.deposit(meter, this.hive.address, {
        from: meter_owner
      });

      await this.stableToken.approve(this.tokenVault.address, HST_TO_DEPOSIT, {
        from: hive_owner
      });
      await this.tokenVault.depositHiveOwner(this.hive.address, {
        from: hive_owner
      });

      var meterOwnerBalance = (await this.stableToken.balanceOf(meter_owner)).toNumber();
      var hiveOwnerBalance = (await this.stableToken.balanceOf(hive_owner)).toNumber();

      var d = new Date();
      var lastSlot = d.getFullYear() * 12.0 + d.getMonth();
      var cashFlow = 0;
      for (var i = 0; i < TARIFF_NAME.length; i++) {
        cashFlow += (1 - TARIFF_TYPE[i] * 2) * ENERGY_FLOWS[i] * PRICE[i];
      }

      if (cashFlow > 0) {
        hiveOwnerBalance += cashFlow;
      } else {
        meterOwnerBalance -= cashFlow;
      }

      //pay for last slot
      await this.hive.sendEnergy(TARIFF_NAME, ENERGY_FLOWS, lastSlot, {
        from: meter
      });
      var meterOwnerBalanceAfter = await this.stableToken.balanceOf(meter_owner);
      var hiveOwnerBalanceAfter = await this.stableToken.balanceOf(hive_owner);

      meterOwnerBalanceAfter.should.be.bignumber.equal(meterOwnerBalance);
      hiveOwnerBalanceAfter.should.be.bignumber.equal(hiveOwnerBalance);
      //check amounts of tokens

      //second attempt to pay or get paid for the given timeslot should fail miserably
      await this.hive.sendEnergy(TARIFF_NAME, ENERGY_FLOWS, lastSlot, {
        from: meter
      }).should.be.rejectedWith(EVMRevert);
    });
  });

});
