pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import './HVTVault.sol';
import './Hive.sol';

contract Beekeeper is Ownable{

  using SafeMath for uint256;

  // meter list
  MeterList metersList;

  // hive list
  HiveList hivesList;
  mapping(address => Hive) hives;

  // stable coins mapping
  mapping(address => bool) stableCoins;
  // add an array with the stable coins addresses

  // tariffs
  mapping(address => bool) tariffs;
  // add an array with the tariffs addresses

  // cost of HVT per meter
  uint meterCost;

  // HVT vault
  HVTVault hvtVault;

  // stable token vault
  TokenVault tokenVault;

  /**
   * event for hive creation
   * @param hive address hive's address
   * @param owner address hive owner's address
   * @param stake uint HVT amount for the staking
   * @param numMeters uint number of meters
   */
  event HiveCreated(address indexed hive, address owner, uint stake, uint numMeters);

  /**
   * event for meters adding
   * @param hive address hive's address
   * @param stake uint HVT amount for the staking
   * @param numMeters uint number of added meters
   */
  event MetersAdded(address indexed hive, uint stake, uint numMeters);

  /**
   * event for hive dropping
   * @param hive address hive's address
   * @param owner address hive owner's address
   */
  event HiveDropped(address indexed hive, address owner);

  /**
   * event for meters dropping
   * @param hive address hive's address
   * @param numMetersDropped uint number of dropped meters
   */
  event MetersDropped(address indexed hive, uint numMetersDropped);

  /**
  * @dev constructor
  * @param _HVTAddress address HVT address
  * @param _tokenVaultAddress address token vault
  * @param _meterListAddress address meter list
  * @param _meterCost uint meter cost in HVT (e.g. _meterCost = 2 => 20 HVT has to be staked in order to create a hive with 10 meters)
  */
  function Beekeeper(address _HVTAddress, address _tokenVaultAddress, address _meterListAddress, uint _meterCost) public {
    require(_HVTAddress != address(0));
    require(_tokenVaultAddress != address(0));
    require(_HVTAddress != _tokenVaultAddress);
    require(_meterCost > 0);

    hvtVault = new HVTVault(_HVTAddress);

    tokenVault = TokenVault(_tokenVaultAddress);

    metersList = MeterList(_meterListAddress);

    meterCost = _meterCost;

    hivesList = new HiveList();
  }

  /**
  * @dev create a hive
  * @param _stableCoin address stable coin to use
  * @param _tariff address tariff to use in the hive
  * @param _dateTime address date/time management
  * @param _stake uint amountt of HVTs to stake
  * @param _meters address meters to add in the hive after its creation
  */
  function createHive(address _stableCoin, address _tariff, address _dateTime, uint _stake, address[] _meters) payable public {
    // check if the stable coin is available to be used
    require(stableCoins[_stableCoin]);

    // check if the tariff is available to be used
    require(tariffs[_tariff]);

    // check if all the meters are available to be inserted in the hive
    require(checkMetersAvailability(_meters, address(0)));

    // if all the input arguments are meaningful, a new hive is created and the related infos added to the list
    Hive tmpHive = new Hive(address(tokenVault), _tariff, _dateTime, address(metersList), address(hivesList));

    // deposit the staking in the HVT vault
    // msg.sender NON È HIVE OWNER perchè non è usato in Hive
    hvtVault.deposit(address(tmpHive), msg.sender, _stake, _meters.length, meterCost);

    // add the meters to hive just created
    tmpHive.addMeters(_meters);

    // add hive to the list
    hivesList.addHive(address(tmpHive), msg.sender);
    hives[address(tmpHive)] = tmpHive;

    HiveCreated(address(tmpHive), msg.sender, _stake, _meters.length);
  }

  /**
  * @dev add a list of meters to a hive
  * @param _hiveAddress address hive address
  * @param _stake uint amountt of HVTs to stake
  * @param _metersToAdd address meters to add in the hive
  */
  function addMetersToHive(address _hiveAddress, uint _stake, address[] _metersToAdd) public {
    // check if the given address is related to an existing hive
    require(hivesList.isHiveRegistered(_hiveAddress));

    // check if msg.sender is the hive owner
    require(msg.sender == hivesList.getOwner(_hiveAddress));

    // check the length of the meters array
    require(_metersToAdd.length > 0);

    // check if all the meters are available to be inserted in the hive
    require(checkMetersAvailability(_metersToAdd, address(0)));

    // deposit the staking in the HVT vault
    hvtVault.deposit(_hiveAddress, msg.sender, _stake, _metersToAdd.length, meterCost);

    // add meters to the hive
    hives[_hiveAddress].addMeters(_metersToAdd);

    MetersAdded(_hiveAddress, _stake, _metersToAdd.length);
  }

  /**
  * @dev drop a hive
  * @param _hiveToDrop address hive to drop
  */
  function dropHive(address _hiveToDrop) public {
    // check if the given address is related to an existing hive
    require(hivesList.isHiveRegistered(_hiveToDrop));

    // check if msg.sender is the hive owner
    require(msg.sender == hivesList.getOwner(_hiveToDrop));

    // release the related meters STILL TO DO!
    // Now the list of meters active in a hive is not stored in Hive contract
    // The unique solution should be to cycle over all the MeterList,
    // an approach potentially affected to vulnerability for cycles long to iterate


    // delete from the list
    hivesList.dropHive(_hiveToDrop);

    // close the vault and withdraw all the staked HVTs to hive owner
    hvtVault.close(_hiveToDrop, msg.sender);

    // delete element from the mapping
    delete hives[_hiveToDrop];

    HiveDropped(_hiveToDrop, msg.sender);
  }

  /**
  * @dev drop a list of meters from a hive
  * @param _hiveAddress address hive's address
  * @param _metersToDrop address meters to drop from the hive
  */
  function dropMetersFromHive(address _hiveAddress, address[] _metersToDrop) public {
    // check if the given address is related to an existing hive
    require(hivesList.isHiveRegistered(_hiveAddress));

    // check if msg.sender is the hive owner
    require(msg.sender == hivesList.getOwner(_hiveAddress));

    // check the meters availability
    require(checkMetersAvailability(_metersToDrop, _hiveAddress));

    // release the related meters STILL TO CHECK!
    hives[_hiveAddress].removeMeters(_metersToDrop);

    // withdraw the staked HVTs to hive owner
    // STILL TO BE IMPLEMENTED
    //hvtVault.withdraw(_hiveAddress, msg.sender, _metersToDrop.length, meterCost);

    MetersDropped(_hiveAddress, _metersToDrop.length);
  }

  // add a stable token to the list
  function addStableToken(address _newStableTokenAddress) onlyOwner public {
    require(!stableCoins[_newStableTokenAddress]);
    stableCoins[_newStableTokenAddress] = true;
  }

  // drop a stable token from the list
  function dropStableToken(address _stableTokenAddressToDrop) onlyOwner public {
    require(stableCoins[_stableTokenAddressToDrop]);
    stableCoins[_stableTokenAddressToDrop] = false;
  }

  // add tariff
  function addTariff(address _newTariffAddress) onlyOwner public {
    require(!tariffs[_newTariffAddress]);
    tariffs[_newTariffAddress] = true;
  }

  /**
  * @dev set cost of a meter in HVT
  * @param _meterCost uint new meter cost in HVT to set
  */
  function setMeterCost(uint _meterCost) public onlyOwner {
    require(_meterCost > 0);
    require(_meterCost != meterCost);
    meterCost = _meterCost;
  }

  /**
  * @dev get cost of a meter in HVT
  */
  function getMeterCost() view returns (uint){
    return meterCost;
  }

  /**
  * @dev get HVT vault
  */
  function getHvtVault() view returns (HVTVault) {
    return hvtVault;
  }

  /**
  * @dev check the meters-availability given their addresses
  * @param _meters address array with the meters addresses
  * @param hiveAddress address hive address
  */
  function checkMetersAvailability(address[] _meters, address hiveAddress) view internal returns (bool){
    bool available = true;

    // cycle over the meters to check
    for (uint i=0; i<_meters.length; i++) {
      // check if the meter is available in the list
      if(metersList.isMeterRegistered(_meters[i])) {
        // check the hive which the meter belongs (0x0 => the meter does not belong to a hive)
        if(metersList.getMeterHive(_meters[i]) != hiveAddress) {
          // the meter is not in the proper hive => it is not available to be inserted in this hive
          available = false;
          break;
        }
      }
      else {
        // the meter is not in the list => it is not available to be inserted into a hive
        available = false;
        break;
      }
    }
    return available;
  }
}
