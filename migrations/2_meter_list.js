var MeterList = artifacts.require('./MeterList.sol');

module.exports = function(deployer, network, accounts) {

  if (network == 'development')
  {
    // Wallet
    var meterAddress = [accounts[0], accounts[1]];
    var hiveAddress = ['0','0'];
    var walletUser = [accounts[2], accounts[3]];
    var currentRating = [16000, 32000];
    var meterType = [0, 1];
    var description = ['test meter 1', 'test meter 2'];
  }
  else if (network == 'ropsten')
  {
    // Wallet
    var meterAddress = ['0x123', '0x234'];
    var hiveAddress = ['0x345', '0x456'];
    var walletUser = ['0x567', '0x678'];
    var currentRating = [16000, 32000];
    var meterType = [0, 1];
    var description = ['test meter 1', 'test meter 2'];
  }

  deployer.deploy(MeterList,
                  meterAddress,
                  hiveAddress,
                  walletUser,
                  currentRating,
                  meterType,
                  description);

  // Waiting for Web3 to be ready!!!
  /*deployer.deploy(MeterList,
                  meterAddress,
                  meterList);*/

};
