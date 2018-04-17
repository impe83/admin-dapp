var SafeMath = artifacts.require('zeppelin-solidity/contracts/math/SafeMath.sol');
var StableToken = artifacts.require('./StableToken.sol');
var HiveList = artifacts.require('./HiveList.sol');
var Hive = artifacts.require('./Hive.sol');
var Tariff = artifacts.require('./Tariff.sol');
var MeterList = artifacts.require('./MeterList.sol');
var DateTime = artifacts.require('../third-party/ethereum-datetime/contracts/DateTime.sol');
var TokenVault = artifacts.require('./TokenVault.sol');

module.exports = function(deployer, network, accounts) {
  //if (network == 'development') {

  var tariffOwner = accounts[1];
  var tariffName = ['High', 'Low', 'Sell'];
  var tariffType = [0, 0, 1];
  var price = [1000, 500, 400];

  var meterAddress = [accounts[0], accounts[1]];
  var hiveAddress = ['0', '0'];
  var walletUser = [accounts[2], accounts[3]];
  var currentRating = [16000, 32000];
  var meterType = [0, 1];
  var description = ['test meter 1', 'test meter 2'];

  var hiveOwner = '0x123';

  deployer.deploy(SafeMath);
  deployer.link(SafeMath, HiveList);
  deployer.link(SafeMath, Hive);
  deployer.link(SafeMath, TokenVault);
  deployer.link(SafeMath, Tariff);


  deployer.deploy(HiveList).then(function() {
    return deployer.deploy(MeterList,
      meterAddress,
      hiveAddress,
      walletUser,
      currentRating,
      meterType,
      description).then(function() {
      return deployer.deploy(StableToken).then(function() {
        return deployer.deploy(DateTime).then(function() {
          return deployer.deploy(Tariff,
            tariffOwner,
            tariffName,
            tariffType,
            price).then(function() {
            return deployer.deploy(HiveList).then(function() {
              return deployer.deploy(TokenVault, HiveList.address, MeterList.address, StableToken.address).then(function() {
                return deployer.deploy(Hive, TokenVault.address, Tariff.address, DateTime.address, MeterList.address, HiveList.address);
              });
            });
          });
        });
      });
    });
  });
};
