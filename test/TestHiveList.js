/*
 * Utilities functions
 */

// Ethers
function ether (n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

// Latest time
function latestTime () {
  return web3.eth.getBlock('latest').timestamp;
}

const EVMRevert = 'revert';

// Advances the block number so that the last mined block is `number`
function advanceBlock () {
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

function increaseTime (duration) {
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

function increaseTimeTo (target) {
  let now = latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const hiveList = artifacts.require('HiveList');

contract('hiveList', function ([_]) {
  const ADDR_HIVE1 =  '0xa46a44c88c6bb62f41a723006a45506632f0c291';
  const ADDR_HIVE2 =  '0xa46a44c88c6bb62f41a723006a45506632f0c292';
  const ADDR_HIVE3 =  '0xa46a44c88c6bb62f41a723006a45506632f0c293';

  const ADDR_HIVE_OWNER1 =  '0x30466f0df8ba9618793e9afc711262b872c80a11';
  const ADDR_HIVE_OWNER2 =  '0x30466f0df8ba9618793e9afc711262b872c80a12';

  var events;

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  // Create the hiveList object
  beforeEach(async function () {
    this.hiveList = await hiveList.new();
  });

  describe('Initial tests:', function () {
    it('should hives list exists with 0 elements', async function () {
      this.hiveList.should.exist;
      var listAddr = await this.hiveList.getHivesAddresses();

      listAddr.length.should.be.bignumber.equal(0);
    });
  });

  describe('Adding tests:', function () {
    it('should add two hives', async function () {
      var listAddr;
      var infoHive;
      var isHive;

      listAddr = await this.hiveList.getHivesAddresses();
      listAddr.length.should.be.bignumber.equal(0);

      // Add the first hive
      await this.hiveList.addHive(ADDR_HIVE1, ADDR_HIVE_OWNER1);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE1);
      listAddr = await this.hiveList.getHivesAddresses();
      isHive = await this.hiveList.isHive(ADDR_HIVE1);

      listAddr.length.should.be.bignumber.equal(1);
      infoHive[0].should.be.bignumber.equal(ADDR_HIVE1);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER1);
      isHive.should.be.true;

      // Add the second hive
      await this.hiveList.addHive(ADDR_HIVE2, ADDR_HIVE_OWNER2);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE2);
      listAddr = await this.hiveList.getHivesAddresses();
      isHive = await this.hiveList.isHive(ADDR_HIVE2);

      listAddr.length.should.be.bignumber.equal(2);
      infoHive[0].should.be.bignumber.equal(ADDR_HIVE2);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER2);
      isHive.should.be.true;
    });
  });

  describe('Dropping tests:', function () {
    it('should add two hives and then remove the first', async function () {
      var listAddr;
      var infoHive;
      var isHive;

      // Check the initial step
      listAddr = await this.hiveList.getHivesAddresses();
      listAddr.length.should.be.bignumber.equal(0);

      // Add the first hive
      await this.hiveList.addHive(ADDR_HIVE1, ADDR_HIVE_OWNER1);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE1);
      isHive = await this.hiveList.isHive(ADDR_HIVE1);
      listAddr = await this.hiveList.getHivesAddresses();

      listAddr.length.should.be.bignumber.equal(1);
      infoHive[0].should.be.bignumber.equal(ADDR_HIVE1);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER1);
      isHive.should.be.true;

      // Add the second hive
      await this.hiveList.addHive(ADDR_HIVE2, ADDR_HIVE_OWNER2);
      isHive = await this.hiveList.isHive(ADDR_HIVE2);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE2);
      listAddr = await this.hiveList.getHivesAddresses();

      listAddr.length.should.be.bignumber.equal(2);
      infoHive[0].should.be.bignumber.equal(ADDR_HIVE2);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER2);
      isHive.should.be.true;

      // Drop the first hive
      await this.hiveList.dropHive(ADDR_HIVE1);
      isHive = await this.hiveList.isHive(ADDR_HIVE1);
      listAddr = await this.hiveList.getHivesAddresses();
      listAddr.length.should.be.bignumber.equal(1);
      isHive.should.be.false;

      // // Check if the second hive is still existing after the dropping of first hive
      infoHive = await this.hiveList.getInfo(ADDR_HIVE2);
      isHive = await this.hiveList.isHive(ADDR_HIVE2);
      listAddr = await this.hiveList.getHivesAddresses();

      listAddr.length.should.be.bignumber.equal(1);
      infoHive[0].should.be.bignumber.equal(ADDR_HIVE2);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER2);
      isHive.should.be.true;
    });
  });

  describe('List address tests:', function () {
    it('should get correct infos from two hives', async function () {
      // Add the first hive
      await this.hiveList.addHive(ADDR_HIVE1, ADDR_HIVE_OWNER1);
      const infoHive1 = await this.hiveList.getInfo(ADDR_HIVE1);
      listAddr = await this.hiveList.getHivesAddresses();

      // Add the second hive
      await this.hiveList.addHive(ADDR_HIVE2, ADDR_HIVE_OWNER2);
      const infoHive2 = await this.hiveList.getInfo(ADDR_HIVE2);
      listAddr = await this.hiveList.getHivesAddresses();

      // Check info of first hive
      infoHive1[0].should.be.bignumber.equal(ADDR_HIVE1);
      infoHive1[1].should.be.bignumber.equal(ADDR_HIVE_OWNER1);

      // Check info of second hive
      infoHive2[0].should.be.bignumber.equal(ADDR_HIVE2);
      infoHive2[1].should.be.bignumber.equal(ADDR_HIVE_OWNER2);
    });
  });

  describe('Change owner tests:', function () {
    it('should change an hive owner in an hive', async function () {
      var infoHive;

      // Add an hive
      await this.hiveList.addHive(ADDR_HIVE1, ADDR_HIVE_OWNER1);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE1);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER1);

      // Change the owner
      await this.hiveList.changeHiveOwner(ADDR_HIVE1, ADDR_HIVE_OWNER2);
      infoHive = await this.hiveList.getInfo(ADDR_HIVE1);
      infoHive[1].should.be.bignumber.equal(ADDR_HIVE_OWNER2);
    });
  });
});
