var SafeMath = artifacts.require('zeppelin-solidity/contracts/math/SafeMath.sol');
var StableToken = artifacts.require('./StableToken.sol');
var HiveList = artifacts.require('./HiveList.sol');
var MeterList = artifacts.require('./MeterList.sol');
var TokenVault = artifacts.require('./TokenVault.sol');

module.exports = function(deployer, network, accounts) {
  //if (network == 'development') {

    var meterAddress = [accounts[0], accounts[1]];
    var hiveAddress = ['0', '0'];
    var walletUser = [accounts[2], accounts[3]];
    var currentRating = [16000, 32000];
    var meterType = [0, 1];
    var description = ['test meter 1', 'test meter 2'];


    deployer.deploy(SafeMath);
    deployer.link(SafeMath, HiveList);

    deployer.deploy(HiveList).then(function() {
      return deployer.deploy(MeterList,
        meterAddress,
        hiveAddress,
        walletUser,
        currentRating,
        meterType,
        description).then(function() {
        return deployer.deploy(StableToken).then(function() {
          return deployer.deploy(TokenVault, HiveList.address, MeterList.address, StableToken.address)
        });
      });
    });
  //}
};
