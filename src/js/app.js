/*
  The App object contains all the functions and variables needed by
  the DAPP to define Web3 and define the behaviour of the functionalities.
*/
App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    //init Web3, contracts, hooks, etc.
    return App.initWeb3();
  },

  initWeb3: function() {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  //If new contracts are needed, they have to be added and gathered here in the same way
  initContract: function() {
    $.getJSON('HiveList.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var HiveListArtifact = data;
      App.contracts.HiveList = TruffleContract(HiveListArtifact);

      // Set the provider for our contract
      App.contracts.HiveList.setProvider(App.web3Provider);


    });

    $.getJSON('Hive.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var HiveArtifact = data;
      App.contracts.Hive = TruffleContract(HiveArtifact);

      // Set the provider for our contract
      App.contracts.Hive.setProvider(App.web3Provider);


    });

    $.getJSON('MeterList.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var MeterListArtifact = data;
      App.contracts.MeterList = TruffleContract(MeterListArtifact);

      // Set the provider for our contract
      App.contracts.MeterList.setProvider(App.web3Provider);


    });

    $.getJSON('Tariff.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var TariffArtifact = data;

      App.contracts.Tariff = TruffleContract(TariffArtifact);

      // Set the provider for our contract
      App.contracts.Tariff.setProvider(App.web3Provider);


    });

    return App.bindEvents();
  },

  //binds events to the buttons defined in the HTML
  bindEvents: function() {
    $(document).on('click', '#add-tariff', App.addTariff);
    $(document).on('click', '#add-meter', App.addMeter);
    $(document).on('click', '#add-hive', App.addHive);
    $(document).on('click', '#remove-hive', App.removeHive);
  },


  /*
    Adds a new tariff. Takes the tariff instance deployed, calls the addTariff
    function with the appropriate parameters. Prints the result on screen.
  */
  addTariff : function(event){
    event.preventDefault();

    //get the name, the price, and the type of tariff
    var newTariffName = $("#input-tariff-name").val();
    var buyOrSell = $('input[name=buyOrSell]:checked').val();
    var buyOrSellString;
    if(buyOrSell){
      buyOrSellString = "Sell";
    }
    else{
      buyOrSellString = "Buy";
    }
    var price = $("#input-tariff-price").val();;

    //gets the deployed contract...
    App.contracts.Tariff.deployed().then(function(instance){
      tariffInstance = instance;

      //... and calls the addTariff function
      return tariffInstance.addTariff(newTariffName, buyOrSell, price)
    }).then(function(result){
      //if everything goes all right prepares an HTML with the result and
      //appends it on the webpage.
      var html = "";
      //notice how i append a function call onClick dynamically so that it removes
      //the right tariff when there are more tha one. i'm smart af
      html += '<button class="btn btn-default btn-adopt" type="button" id="remove-tariff-'+newTariffName+'" onclick="App.removeTariff(\''+newTariffName+'\')">Remove Tariff ' + newTariffName + ' ('+buyOrSellString+' at '+price+')</button><br>';
      html += '<button class="btn btn-default btn-adopt" type="button" id="get-tariff-'+newTariffName+'" onclick="App.getTariff(\''+newTariffName+'\')">Get info about Tariff ' + newTariffName + '</button><br>';
      html += '<div id="tariff-info-'+newTariffName+'"></div>'
      $("#added-tariffs").append(html);
      console.log(result);
    }).catch(function(err) {
      //if there is an error somewhere it prints it
      console.log("error add tariff");
      console.log(err.message);
    });
  },

  //gets the data about one added tariff
  getTariff : function(tariffName){
    App.contracts.Tariff.deployed().then(function(instance){
      tariffInstance = instance;

      return tariffInstance.getTariff(tariffName)
    }).then(function(result){
      //construct html, the result received is formatted in a weird way
      var buyOrSell;
      if(result[1].c[0] == 0){
        buyOrSell = "Buy";
      }
      else {
        buyOrSell = "Sell";
      }

      var html = "Price: "+ result[0].c[0] + "<br/>Type: " + buyOrSell;
      $("#tariff-info-" + tariffName).html(html);
    }).catch(function(err) {
      console.log("error get tariff");
      console.log(err.message);
    });
  },


  //removes one added tariff
  removeTariff : function(tariffName){

    App.contracts.Tariff.deployed().then(function(instance){
      tariffInstance = instance;

      return tariffInstance.removeTariff(tariffName)
    }).then(function(result){
      console.log(result);
      //if successfull, remove the buttons
      if(result.receipt){
        $("#remove-tariff-"+tariffName).remove();
        $("#get-tariff-"+tariffName).remove();
        $("#tariff-info-"+tariffName).remove();
      }
    }).catch(function(err) {
      console.log("error remove tariff");
      console.log(err.message);
    });
  },



  /*
    Adds a new meter. Gets the current account, gets the meter list, gets the
    values and calls the addMeter function. Prints the result on HTML if successful.
  */
  addMeter : function(event) {
    event.preventDefault();

    //get the account from Web3
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      //get the specified values from the form
      var account = accounts[0];
      var meterAddress = $("#input-meter-address").val();
      var hiveAddress = $("#input-hive-address-meter").val();
      var rating = $("#input-meter-rating").val();
      var meterType = $('input[name=meter-type]:checked').val();
      var description = $("#input-meter-description").val();
      App.contracts.MeterList.deployed().then(function(instance){
        meterListInstance = instance;

        console.log(meterAddress, hiveAddress, account, rating, meterType, description);
        //calls addMeter to add the new meter
        return meterListInstance.addMeter(meterAddress, hiveAddress, account, rating, meterType, description);
      }).then(function(result){
        console.log(result);
        //produces buttons in HTML much like how the tariff code does
        var html = "";
        html += '<button class="btn btn-default btn-adopt" type="button" id="remove-meter-'+meterAddress+'" onclick="App.removeMeter(\''+meterAddress+'\')">Remove Meter ' + meterAddress + ' </button><br>';
        html += '<button class="btn btn-default btn-adopt" type="button" id="get-meter-'+meterAddress+'" onclick="App.getMeter(\''+meterAddress+'\')">Get info about Meter ' + meterAddress + '</button><br>';
        html += '<div id="tariff-info-'+meterAddress+'"></div>'
        $("#added-meters").append(html);
      }).catch(function(err) {
        console.log("error");
        console.log(err.message);
      });
    });
  },

  //TODO: left as an exercise :D :D :D
  removeMeter : function(event){
    event.preventDefault();
  },

  //returns the data about one added meter
  getMeter : function(meterAddress){

    App.contracts.MeterList.deployed().then(function(instance){
      meterListInstance = instance;

      return meterListInstance.getMeterInfo(meterAddress);
    }).then(function(result){
      console.log(result);

    }).catch(function(err) {
      console.log("error");
      console.log(err.message);
    });
  },

  //TODO
  addHive : function(event){
    event.preventDefault();
  },

  //TODO
  removeHive : function(event){
    event.preventDefault();
  }

};

//helper used in the demo DAPP, maybe useful here too
function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}



//jQuery handle to call App.init() when the page has loaded
$(function() {
  $(window).on('load', function() {
    App.init();
  });
});
