var Tariff = artifacts.require('./Tariff.sol');

module.exports = function(deployer, network, accounts) {

  if (network == 'development')
  {
    var tariffOwner = accounts[1];
    var tariffName = ['High', 'Low', 'Sell'];
    var tariffType = [0, 0, 1];
    var price = [1000,500,400];

  }
  else if (network == 'ropsten')
  {
    // Wallet
    var tariffOwner = accounts[1];
    var tariffName = ['High', 'Low', 'Sell'];
    var tariffType = [0, 0, 1];
    var price = [1000,500,400];
  }

  deployer.deploy(Tariff,
                  tariffOwner,
                  tariffName,
                  tariffType,
                  price);
};
