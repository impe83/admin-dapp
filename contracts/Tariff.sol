pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract Tariff is Ownable{

    enum TariffType { Buy, Sell }
    struct TariffStruct{
      uint256 price;
      TariffType tariffType;
      }

    address tariffOwner;
    mapping (bytes32 => TariffStruct) public tariff;
    mapping (bytes32 => bool) public isTariff;

    /*  Modifiers */
    modifier onlyOwners() {
        require(msg.sender == tariffOwner || msg.sender == owner);
        _;
    }

    /* events */
    event TariffsAdded(uint numTariffsAdded);
    event TariffsRemoved(uint numTariffsRemoved);
    event TariffsUpdated(uint numTariffsUpdated);
    event TariffAdded();
    event TariffRemoved();
    event TariffUpdated();

    /* Public functions */
    function Tariff(address _tariffOwner, bytes32[] _tariffName, TariffType[] _tariffType, uint256[] _prices)
      public {
        require(_tariffOwner!=address(0));
        tariffOwner=_tariffOwner;
        setTariffsParameters(_tariffName, _tariffType, _prices);
      }

    function updateTariffs(bytes32[] _tariffName, TariffType[] _tariffType, uint256[] _prices) onlyOwners()
      public{
        setTariffsParameters(_tariffName, _tariffType, _prices);
        TariffsUpdated(_tariffName.length);
      }

    function updateTariff(bytes32 _tariffName, TariffType _tariffType, uint256 _prices) onlyOwners()
      public{
        setTariffParameters(_tariffName, _tariffType, _prices);
        TariffUpdated();
      }

    function addTariffs(bytes32[] _tariffName, TariffType[] _tariffType, uint256[] _prices) onlyOwner()
      public{
        setTariffsParameters(_tariffName, _tariffType, _prices);
        TariffsAdded(_tariffName.length);
      }

    function addTariff(bytes32 _tariffName, TariffType _tariffType, uint256 _prices) onlyOwner()
      public{
        setTariffParameters(_tariffName, _tariffType, _prices);
        TariffAdded();
      }

    function removeTariffs(bytes32[] _tariffName) onlyOwner()
      public{
        for (uint i=0; i<_tariffName.length; i++) {
          removeTariff(_tariffName[i]);
        }
        TariffsRemoved(_tariffName.length);
      }
    function removeTariff(bytes32 _tariffName) onlyOwner()
      public{

          deleteTariff(_tariffName);

          TariffRemoved();
      }

    function getTariff(bytes32 _tariffName) view public returns(uint, TariffType){
        require(isTariff[_tariffName]);
        return(tariff[_tariffName].price, tariff[_tariffName].tariffType);
      }

    function getTariffPrice(bytes32 _tariffName) view public returns (uint) {
      require(isTariff[_tariffName]);
      return(tariff[_tariffName].price);
    }

    function isTariffRegistered(bytes32 _tariffName) view public returns(bool){
      return(isTariff[_tariffName]);
    }

  /* Internal functions */
  function deleteTariff(bytes32 _tariffName)
    internal{
      isTariff[_tariffName] = false;
      delete tariff[_tariffName];
    }

  function setTariffsParameters(bytes32[] _tariffName, TariffType[] _tariffType, uint256[] _prices)
    internal{
      require(_tariffType.length == _tariffName.length);
      require(_prices.length == _tariffName.length);
      for (uint i=0; i<_tariffName.length; i++) {
        setTariffParameters(_tariffName[i], _tariffType[i], _prices[i]);
      }
    }

    function setTariffParameters(bytes32 _tariffName, TariffType _tariffType, uint256 _prices)
      internal{
          if (msg.sender == owner){
              isTariff[_tariffName] = true;
          }
          else{
            require(isTariff[_tariffName]);
          }
          tariff[_tariffName] = TariffStruct(_prices, _tariffType);
        }
}
