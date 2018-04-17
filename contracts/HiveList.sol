pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract HiveList is Ownable{

  enum HiveStatus { Active, NOT_ACTIVE}

  using SafeMath for uint256;

  struct HiveData
  {
      // address of the hive
      address hive;

      // hive Owner address (e.g. a DSO wallet)
      address hiveOwner;

      // hive status
      HiveStatus status;
  }

  mapping (address => HiveData) public hives;
  mapping (address => bool) public isHive;

  address[] hivesAddresses;

  /* when a meter is added */
  event HiveAdded(address addrAddedMeter);

  /* when a meter is dropped */
  event HiveDropped(address addrDroppedMeter);

  /* when a hive owner is changed */
  event HiveOwnerChanged(address hiveAddress, address  oldHiveOwner, address newHiveOwner);

  // add a hive to the list and the mapping
  function addHive(address _hiveToAdd, address _hiveOwner) onlyOwner public {
    require(_hiveToAdd != 0x0);
    require(hives[_hiveToAdd].hive == 0x0);
    require(hives[_hiveToAdd].hiveOwner == 0x0);

    hives[_hiveToAdd] = HiveData(_hiveToAdd, _hiveOwner, HiveStatus.Active);
    hivesAddresses.push(_hiveToAdd);
    isHive[_hiveToAdd] = true;

    HiveAdded(_hiveToAdd);
  }

  // drop a hive from the list and the mapping
  function dropHive(address _hiveToDrop) onlyOwner public {
    require(_hiveToDrop != 0x0);
    require(isHive[_hiveToDrop]);

    bool found = false;
    uint256 idxFound = 0;

    for (uint i=0; i<hivesAddresses.length; i++) {
      if(hivesAddresses[i] == _hiveToDrop) {
        idxFound = i;
        found = true;
        break;
      }
    }

    // check if a hive was found
    require(found);

    // drop hive
    delete hives[_hiveToDrop];
    hivesAddresses[idxFound] = hivesAddresses[hivesAddresses.length-1];

    // drop last element from array
    delete hivesAddresses[hivesAddresses.length-1];
    hivesAddresses.length--;

    isHive[_hiveToDrop] = false;

    HiveDropped(_hiveToDrop);
  }

  // get info about an hive status
  function getInfo(address _hive) view public returns(address, address, HiveStatus) {
    require(_hive != 0x0);
    require(isHive[_hive]);

    return (hives[_hive].hive, hives[_hive].hiveOwner, hives[_hive].status);
  }

  // get owner address
  function getOwner(address _hive) view public returns(address) {
    require(_hive != 0x0);
    require(isHive[_hive]);
    return (hives[_hive].hiveOwner);
  }

  // get info about an hive status
  function getStatus(address _hive) view public returns(HiveStatus) {
    require(_hive != 0x0);
    require(isHive[_hive]);
    return (hives[_hive].status);
  }

  // get list of hive addresses
  function getHivesAddresses() view public returns(address[]) {
    return hivesAddresses;
  }

  // get list of hive addresses
  function isHiveRegistered(address _hiveAddress) view public returns(bool) {
    return isHive[_hiveAddress];
  }

  // change hive owner
  function changeHiveOwner(address _hive, address _newHiveOwner) onlyOwner public returns(bool) {
    require(_hive != 0x0);
    require(_newHiveOwner != 0x0);
    require(isHive[_hive]);
    require(hives[_hive].hiveOwner != _newHiveOwner);

    address oldHiveOwner = hives[_hive].hiveOwner;
    hives[_hive].hiveOwner = _newHiveOwner;

    HiveOwnerChanged(_hive, oldHiveOwner, _newHiveOwner);
    return true;
  }
}
