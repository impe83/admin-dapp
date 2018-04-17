pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MeterList is Ownable{
  enum MeterType {CONSUMER,PRODUCER,BIDIRECTIONAL}
  //using SafeMath for uint256;
  struct Meter{
    address hiveAddress; // 0x => meter not assigned to a hive
    address walletUser;  // address of the user related to the meter
    uint currentRating;  // mA
    MeterType meterType;
    bytes32 description;
    }

  mapping (address => bool) public isMeter;
  mapping (address => Meter) public meters;

  /* modifiers */
  modifier sameLength(address[] _meterAddress, address[] _hiveAddress, address[] _walletUser, uint[] _currentRating, MeterType[] _meterType, bytes32[] _description) {
        require(_hiveAddress.length == _meterAddress.length);
        require(_walletUser.length == _meterAddress.length);
        require(_currentRating.length == _meterAddress.length);
        require(_meterType.length == _meterAddress.length);
        require(_description.length == _meterAddress.length);
        _;
    }

  /* events */
  event MetersAdded(uint numMetersAdded);
  event MetersRemoved(uint numMetersRemoved);
  event MetersUpdated(uint numMetersUpdated);
  event MetersAssignedHive(uint numMetersAssigned);
  event MetersDroppedHive(uint numMetersDropped);
  event MetersAssignedEnduser(uint numMetersAssigned);
  event MetersDroppedEnduser(uint numMetersDropped);

  function MeterList(address[] _meterAddress, address[] _hiveAddress, address[] _walletUser, uint[] _currentRating, MeterType[] _meterType, bytes32[] _description)
    sameLength(_meterAddress, _hiveAddress, _walletUser, _currentRating, _meterType, _description)
    public {
    for (uint i=0; i<_meterAddress.length; i++) {
      require(_meterAddress[i] != address(0));
      meters[_meterAddress[i]] = Meter(_hiveAddress[i], _walletUser[i], _currentRating[i], _meterType[i], _description[i]);
      isMeter[_meterAddress[i]] = true;
    }
  }

  function addMeters(address[] _meterAddress, address[] _hiveAddress, address[] _walletUser, uint[] _currentRating, MeterType[] _meterType, bytes32[] _description) onlyOwner
    sameLength(_meterAddress, _hiveAddress, _walletUser, _currentRating, _meterType, _description)
    public {
    for (uint i=0; i<_meterAddress.length; i++) {
        addMeter(_meterAddress[i], _hiveAddress[i], _walletUser[i], _currentRating[i], _meterType[i], _description[i]);
      }
      MetersAdded(_meterAddress.length);
  }

  function addMeter(address _meterAddress, address _hiveAddress, address _walletUser, uint _currentRating, MeterType _meterType, bytes32 _description) onlyOwner public  {
    require(!isMeter[_meterAddress]);
    require(_meterAddress != address(0));
    meters[_meterAddress] = Meter(_hiveAddress, _walletUser, _currentRating, _meterType, _description);
    isMeter[_meterAddress] = true;
  }

  function removeMeters(address[] _meterAddress) onlyOwner public {
    for (uint i=0; i<_meterAddress.length; i++) {
        removeMeter(_meterAddress[i]);
      }
      MetersRemoved(_meterAddress.length);
  }

  function removeMeter(address _meterAddress) onlyOwner public {
        require(isMeter[_meterAddress]);
        delete meters[_meterAddress];
        isMeter[_meterAddress] = false;
  }

  function updateMeters(address[] _meterAddress, address[] _hiveAddress, address[] _walletUser, uint[] _currentRating, MeterType[] _meterType, bytes32[] _description) onlyOwner
    sameLength(_meterAddress, _hiveAddress, _walletUser, _currentRating, _meterType, _description)
    public {
      for (uint i=0; i<_meterAddress.length; i++) {
          updateMeter(_meterAddress[i], _hiveAddress[i], _walletUser[i], _currentRating[i], _meterType[i], _description[i]);
        }
        MetersUpdated(_meterAddress.length);
  }

  function updateMeter(address _meterAddress, address _hiveAddress, address _walletUser, uint _currentRating, MeterType _meterType, bytes32 _description) onlyOwner public {
    require(isMeter[_meterAddress]);
    require(_meterAddress != address(0));
    meters[_meterAddress] = Meter(_hiveAddress, _walletUser, _currentRating, _meterType, _description);
  }

  function assignMetersToHive(address[] _meterAddress, address _hiveAddress) onlyOwner public {
    for (uint i=0; i<_meterAddress.length; i++) {
      assignMeterToHive(_meterAddress[i], _hiveAddress);
    }
    MetersAssignedHive(_meterAddress.length);
  }

  function assignMeterToHive(address _meterAddress, address _hiveAddress) onlyOwner public {
    require(isMeter[_meterAddress]);
    meters[_meterAddress].hiveAddress = _hiveAddress;
  }

  function dropMetersFromHive(address[] _meterAddress) onlyOwner public {
    for (uint i=0; i<_meterAddress.length; i++) {
      dropMeterFromHive(_meterAddress[i]);
    }
    MetersDroppedHive(_meterAddress.length);
  }

  function dropMeterFromHive(address _meterAddress) onlyOwner public {
    require(isMeter[_meterAddress]);
    meters[_meterAddress].hiveAddress = address(0);
  }

  function setMetersEndUser(address[] _meterAddress, address[] _walletUser) onlyOwner public {
    require(_meterAddress.length == _walletUser.length);
    for (uint i=0; i<_meterAddress.length; i++) {
      setMeterEndUser(_meterAddress[i],_walletUser[i]);
    }
    MetersAssignedEnduser(_meterAddress.length);
  }

  function setMeterEndUser(address _meterAddress, address _walletUser) onlyOwner public {
    require(isMeter[_meterAddress]);
    meters[_meterAddress].walletUser = _walletUser;
  }

  function dropMetersEndUser(address[] _meterAddress) onlyOwner public {
    for (uint i=0; i<_meterAddress.length; i++) {
      dropMeterEndUser(_meterAddress[i]);
    }
    MetersDroppedEnduser(_meterAddress.length);
  }

  function dropMeterEndUser(address _meterAddress) onlyOwner public {
    require(isMeter[_meterAddress]);
    meters[_meterAddress].walletUser = address(0);
  }

  function getMeterInfo(address _meterAddress) view public returns(address, address, uint, MeterType, bytes32){
    require(isMeter[_meterAddress]);
    return(meters[_meterAddress].hiveAddress,
      meters[_meterAddress].walletUser,
      meters[_meterAddress].currentRating,
      meters[_meterAddress].meterType,
      meters[_meterAddress].description);
  }

  function getMeterHive(address _meterAddress) view public returns(address){
    require(isMeter[_meterAddress]);
    return meters[_meterAddress].hiveAddress;
  }

  function getMeterUser(address _meterAddress) view public returns(address){
    require(isMeter[_meterAddress]);
    return meters[_meterAddress].walletUser;
  }

  function isMeterRegistered(address _meterAddress) view public returns(bool){
    return(isMeter[_meterAddress]);
  }

}
