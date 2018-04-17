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

const Tariff = artifacts.require('Tariff');


contract('Tariff', function([_, tariff_owner, standard_user]) {
  const TARIFF_NAME = ['high', 'low', 'sell'];
  const TARIFF_TYPE = [0, 0, 1];
  const PRICE = [1000, 500, 400];

  var events;

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  // Create the tariff object
  beforeEach(async function() {
    this.tariff = await Tariff.new(
      tariff_owner,
      TARIFF_NAME,
      TARIFF_TYPE,
      PRICE
    );

    // Or pass a callback to start watching immediately
    events = this.tariff.allEvents({
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
    it('should create tariff', async function() {
      this.tariff.should.exist;
    });
  });

  describe('Getters:', function() {
    it('should return the tariff data when queried', async function() {
      for (var i = 0; i < TARIFF_NAME.length; i++) {
        var price = await this.tariff.getTariff(TARIFF_NAME[i]);
        price[0].should.be.bignumber.equal(PRICE[i]);
        price[1].should.be.bignumber.equal(TARIFF_TYPE[i]);
      }
    });
  });

  describe('tariffs manipulation:', function() {
    const TARIFF_NAME_ADD = ['medium'];
    const TARIFF_TYPE_ADD = [0];
    const PRICE_ADD = [750];

    it('add and remove tariff', async function() {
      //add
      //test as standard user
      await this.tariff.addTariffs(TARIFF_NAME_ADD,
        TARIFF_TYPE_ADD,
        PRICE_ADD, {
          from: standard_user
        }).should.be.rejectedWith(EVMRevert);
      //test as tariff_owner
      await this.tariff.addTariffs(TARIFF_NAME_ADD,
        TARIFF_TYPE_ADD,
        PRICE_ADD, {
          from: tariff_owner
        }).should.be.rejectedWith(EVMRevert);
      //test as owner
      await this.tariff.addTariffs(TARIFF_NAME_ADD,
        TARIFF_TYPE_ADD,
        PRICE_ADD);

      for (var i = 0; i < TARIFF_NAME_ADD.length; i++) {
        var isTariffRegistered = await this.tariff.isTariffRegistered(TARIFF_NAME_ADD[i]);
        isTariffRegistered.should.be.true;
        var price = await this.tariff.getTariff(TARIFF_NAME_ADD[i]);
        price[0].should.be.bignumber.equal(PRICE_ADD[i]);
        price[1].should.be.bignumber.equal(TARIFF_TYPE_ADD[i]);
      }

      //remove
      //test as standard user
      await this.tariff.removeTariffs(TARIFF_NAME_ADD, {
        from: standard_user
      }).should.be.rejectedWith(EVMRevert);
      //test as tariff_owner
      await this.tariff.removeTariffs(TARIFF_NAME_ADD, {
        from: tariff_owner
      }).should.be.rejectedWith(EVMRevert);
      //test as owner
      await this.tariff.removeTariffs(TARIFF_NAME_ADD);

      for (var i = 0; i < TARIFF_NAME_ADD.length; i++) {
        var isMeterRegistered = await this.tariff.isTariffRegistered(TARIFF_NAME_ADD[i]);
        isMeterRegistered.should.be.false;
      }

    });

    it('updated tariffs', async function() {
      var TARIFF_NAME_UP = ['high'];
      var TARIFF_TYPE_UP = [1];
      var PRICE_UP = [1500];
      //update
      //test as standard user
      await this.tariff.updateTariffs(TARIFF_NAME_UP,
        TARIFF_TYPE_UP,
        PRICE_UP, {
          from: standard_user
        }).should.be.rejectedWith(EVMRevert);

      //test as owner
      await this.tariff.updateTariffs(TARIFF_NAME_UP,
        TARIFF_TYPE_UP,
        PRICE_UP);

      for (var i = 0; i < TARIFF_NAME_UP.length; i++) {
        var price = await this.tariff.getTariff(TARIFF_NAME_UP[i]);
        price[0].should.be.bignumber.equal(PRICE_UP[i]);
        price[1].should.be.bignumber.equal(TARIFF_TYPE_UP[i]);
      }

      TARIFF_TYPE_UP = [0];
      var PRICE_UP = [2500];
      //test as tariff_owner
      await this.tariff.updateTariffs(TARIFF_NAME_UP,
        TARIFF_TYPE_UP,
        PRICE_UP, {
          from: tariff_owner
        });

      for (var i = 0; i < TARIFF_NAME_UP.length; i++) {
        var price = await this.tariff.getTariff(TARIFF_NAME_UP[i]);
        price[0].should.be.bignumber.equal(PRICE_UP[i]);
        price[1].should.be.bignumber.equal(TARIFF_TYPE_UP[i]);
      }
    });
  });
});
