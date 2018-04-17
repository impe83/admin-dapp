var SafeMath = artifacts.require('zeppelin-solidity/contracts/math/SafeMath.sol');
var HiveList = artifacts.require('./HiveList.sol');

module.exports = function(deployer, network, accounts) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, HiveList);
  deployer.deploy(HiveList);
};
