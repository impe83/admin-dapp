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

const MeterList = artifacts.require('MeterList');


contract('MeterList', function([_, standard_user]) {
  const METER_ADDRESS = ['0x1230000000000000000000000000000000000000', '0x4560000000000000000000000000000000000000'];
  const HIVE_ADDRESS = ['0x0123000000000000000000000000000000000000', '0x0456000000000000000000000000000000000000'];
  const WALLET_USER = ['0xabc0000000000000000000000000000000000000', '0xdef0000000000000000000000000000000000000'];
  const CURRENT_RATING = [16000, 32000];
  const METER_TYPE = [0, 1];
  const DESCRIPTION = ['test meter 1', 'test meter 2'];

  // const value = ether(1);
  const value = 1e6;
  var events;

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  // Create the meter list object
  beforeEach(async function() {
    this.meterList = await MeterList.new(
      METER_ADDRESS,
      HIVE_ADDRESS,
      WALLET_USER,
      CURRENT_RATING,
      METER_TYPE,
      DESCRIPTION
    );

    // Or pass a callback to start watching immediately
    events = this.meterList.allEvents({
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
    it('should create meter list', async function() {
      this.meterList.should.exist;
    });
  });

  describe('Getters:', function() {
    it('should return the meter struct when queried', async function() {
      for (var i = 0; i < METER_ADDRESS.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS[i]);
        meterInfo[0].should.be.equal(HIVE_ADDRESS[i]);
        meterInfo[1].should.be.equal(WALLET_USER[i]);
        meterInfo[2].should.be.bignumber.equal(CURRENT_RATING[i]);
        meterInfo[3].should.be.bignumber.equal(METER_TYPE[i]);
        web3.toUtf8(meterInfo[4]).should.be.equal(DESCRIPTION[i]);
      }
    });
  });

  describe('Add Meters and remove meters:', function() {
    const METER_ADDRESS_ADD = ['0x0012300000000000000000000000000000000000', '0x0045600000000000000000000000000000000000'];
    var HIVE_ADDRESS_ADD = ['0x0001230000000000000000000000000000000000', '0x0004560000000000000000000000000000000000'];
    var WALLET_USER_ADD = ['0x0abc000000000000000000000000000000000000', '0x0def000000000000000000000000000000000000'];
    var CURRENT_RATING_ADD = [10000, 20000];
    var METER_TYPE_ADD = [2, 0];
    var DESCRIPTION_ADD = ['test meter 3', 'test meter 4'];

    it('meters list manipulation', async function() {
      for (var i = 0; i < METER_ADDRESS_ADD.length; i++) {
        var meterRegistered = await this.meterList.isMeterRegistered(METER_ADDRESS_ADD[i]);
        meterRegistered.should.be.false;
      }
    });

    it('one should be able to add, update and remove meters', async function() {
      // add the meters

      //test only owner
      await this.meterList.addMeters(METER_ADDRESS_ADD,
        HIVE_ADDRESS_ADD,
        WALLET_USER_ADD,
        CURRENT_RATING_ADD,
        METER_TYPE_ADD,
        DESCRIPTION_ADD,{ from: standard_user}).should.be.rejectedWith(EVMRevert);


      await this.meterList.addMeters(METER_ADDRESS_ADD,
        HIVE_ADDRESS_ADD,
        WALLET_USER_ADD,
        CURRENT_RATING_ADD,
        METER_TYPE_ADD,
        DESCRIPTION_ADD);

      for (var i = 0; i < METER_ADDRESS_ADD.length; i++) {
        var meterRegistered = await this.meterList.isMeterRegistered(METER_ADDRESS_ADD[i]);
        meterRegistered.should.be.true;
      }

      for (var i = 0; i < METER_ADDRESS_ADD.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS_ADD[i]);
        meterInfo[0].should.be.equal(HIVE_ADDRESS_ADD[i]);
        meterInfo[1].should.be.equal(WALLET_USER_ADD[i]);
        meterInfo[2].should.be.bignumber.equal(CURRENT_RATING_ADD[i]);
        meterInfo[3].should.be.bignumber.equal(METER_TYPE_ADD[i]);
        web3.toUtf8(meterInfo[4]).should.be.equal(DESCRIPTION_ADD[i]);
      }
      //update the meters
      HIVE_ADDRESS_ADD = ['0x9001230000000000000000000000000000000000', '0x9004560000000000000000000000000000000000'];
      WALLET_USER_ADD = ['0x9abc000000000000000000000000000000000000', '0x9def000000000000000000000000000000000000'];
      CURRENT_RATING_ADD = [10001, 20001];
      METER_TYPE_ADD = [1, 2];
      DESCRIPTION_ADD = ['test meter 3u', 'test meter 4u'];


      await this.meterList.updateMeters(METER_ADDRESS_ADD,
        HIVE_ADDRESS_ADD,
        WALLET_USER_ADD,
        CURRENT_RATING_ADD,
        METER_TYPE_ADD,
        DESCRIPTION_ADD, { from: standard_user}).should.be.rejectedWith(EVMRevert);

      await this.meterList.updateMeters(METER_ADDRESS_ADD,
        HIVE_ADDRESS_ADD,
        WALLET_USER_ADD,
        CURRENT_RATING_ADD,
        METER_TYPE_ADD,
        DESCRIPTION_ADD);

      for (var i = 0; i < METER_ADDRESS_ADD.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS_ADD[i]);
        meterInfo[0].should.be.equal(HIVE_ADDRESS_ADD[i]);
        meterInfo[1].should.be.equal(WALLET_USER_ADD[i]);
        meterInfo[2].should.be.bignumber.equal(CURRENT_RATING_ADD[i]);
        meterInfo[3].should.be.bignumber.equal(METER_TYPE_ADD[i]);
        web3.toUtf8(meterInfo[4]).should.be.equal(DESCRIPTION_ADD[i]);
      }

      //remove the neters

      await this.meterList.removeMeters(METER_ADDRESS_ADD, { from: standard_user}).should.be.rejectedWith(EVMRevert);
      await this.meterList.removeMeters(METER_ADDRESS_ADD);

      for (var i = 0; i < METER_ADDRESS_ADD.length; i++) {
        var meterRegistered = await this.meterList.isMeterRegistered(METER_ADDRESS_ADD[i]);
        meterRegistered.should.be.false;
      }
    });

    it('one should NOT be able to add already existing meters', async function() {
      await this.meterList.addMeters(METER_ADDRESS,
        HIVE_ADDRESS,
        WALLET_USER,
        CURRENT_RATING,
        METER_TYPE,
        DESCRIPTION).should.be.rejectedWith(EVMRevert);
    });

    it('one should NOT be able to remove non existing meters', async function() {
      await this.meterList.removeMeters(METER_ADDRESS_ADD).should.be.rejectedWith(EVMRevert);
    });

    it('adding and dropping meters to and from Hives', async function() {
      const HIVE_ADDRESS_NEW = '0x9001230000000000000000000000000000000000';
      const METER_ADDRESS_UNREGISTERED = ['0x9001230000000000000000000000000000000000', '0x9004560000000000000000000000000000000000'];

      //adding to hive
      await this.meterList.assignMetersToHive(METER_ADDRESS, HIVE_ADDRESS_NEW, { from: standard_user}).should.be.rejectedWith(EVMRevert);
      await this.meterList.assignMetersToHive(METER_ADDRESS, HIVE_ADDRESS_NEW);
      for (var i = 0; i < METER_ADDRESS.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS[i]);
        meterInfo[0].should.be.equal(HIVE_ADDRESS_NEW);
      }

      //dropping from hive
      await this.meterList.dropMetersFromHive(METER_ADDRESS, { from: standard_user}).should.be.rejectedWith(EVMRevert);
      await this.meterList.dropMetersFromHive(METER_ADDRESS);
      for (var i = 0; i < METER_ADDRESS.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS[i]);
        meterInfo[0].should.be.bignumber.equal(0);
      }

      //adding non existing meters
      await this.meterList.assignMetersToHive(METER_ADDRESS_UNREGISTERED, HIVE_ADDRESS_NEW).should.be.rejectedWith(EVMRevert);

    });

    it('adding and dropping user wallets to and from meters', async function() {
      const WALLET_USER_NEW = ['0x7001230000000000000000000000000000000000', '0x8001230000000000000000000000000000000000'];
      const METER_ADDRESS_UNREGISTERED = ['0x9001230000000000000000000000000000000000', '0x9004560000000000000000000000000000000000'];

      // set user to meter
      await this.meterList.setMetersEndUser(METER_ADDRESS, WALLET_USER_NEW, { from: standard_user}).should.be.rejectedWith(EVMRevert);
      await this.meterList.setMetersEndUser(METER_ADDRESS, WALLET_USER_NEW);
      for (var i = 0; i < METER_ADDRESS.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS[i]);
        meterInfo[1].should.be.equal(WALLET_USER_NEW[i]);
      }

      // drop users from meters
      await this.meterList.dropMetersEndUser(METER_ADDRESS, { from: standard_user}).should.be.rejectedWith(EVMRevert);
      await this.meterList.dropMetersEndUser(METER_ADDRESS);
      for (var i = 0; i < METER_ADDRESS.length; i++) {
        var meterInfo = await this.meterList.getMeterInfo(METER_ADDRESS[i]);
        meterInfo[1].should.be.bignumber.equal(0);
      }

      // set user of a non-existing meter
      await this.meterList.setMetersEndUser(METER_ADDRESS_UNREGISTERED, WALLET_USER_NEW).should.be.rejectedWith(EVMRevert);
    });

  });
});
