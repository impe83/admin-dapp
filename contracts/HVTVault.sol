pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './HVT.sol';
/*import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';*/

/**
 * @title HVTVault
 */
contract HVTVault is Ownable {
  using SafeMath for uint256;

  // state of the vault
  enum State { Init, Active, Closed }

  // data structure of the vault
  struct Data {
    // HVT staked/deposited
    uint256 deposited;
    // number of meters in the hive
    uint256 numMeters;

    // cost per meter when the hive was created
    uint256 costPerMeter;

    // state of the hive
    State state;
  }

  // vault data (address is the hive address)
  mapping (address => Data) public data;

  // HVT token
  HVT hvt;

  /**
   * event for vault closing
   * @param hive address hive's address
   * @param hiveOwner address hive owner's address
   */
  event Close(address indexed hive, address indexed hiveOwner);

  /**
   * event for vault partial withdraw
   * @param hive address hive's address
   * @param hiveOwner address hive owner's address
   * @param amount uint amount to withdraw
   * @param numMeters uint number of meters dropped from the hive
   */
  event Withdraw(address indexed hive, address indexed hiveOwner, uint amount, uint numMeters);

  /**
   * event for vault deposit
   * @param staker address staker address
   * @param stake uint HVT amount for the staking
   * @param realStake uint real HVT amount needed for the staking
   * @param numMeters uint number of meters
   * @param hvtPerMeter uint HVT cost per meter
   */
  event Deposited(address indexed staker, uint256 stake, uint256 realStake, uint256 numMeters, uint256 hvtPerMeter);

  /**
  * @dev constructor
  * @param _addressHVT address HVT address
  */
 function HVTVault(address _addressHVT) public {
    // create the HVT instance
    hvt = HVT(_addressHVT);
  }


  /**
  * @dev deposit the staking for a hive
  * @param _hive address hive's address
  * @param _hiveOwner address address of the hive owner
  * @param _stake uint HVTs amount to stake
  * @param _numMeters uint HVTs number of meters in the hive
  * @param _meterCost uint meter cost in HVT (e.g. _meterCost = 2 => 20 HVT has to be staked in order to create a hive with 10 meters)
  */
  function deposit(address _hive, address _hiveOwner, uint256 _stake, uint256 _numMeters, uint256 _meterCost) onlyOwner public {
    // check the allowance
    uint allowed = hvt.allowance(_hiveOwner, this);
    require(allowed >= _stake);

    // calculate the real amount of HVT to stake for the given number of meters
    uint256 hvtToStake = _numMeters.mul(_meterCost);

    // check if the proposed staking is enough
    require(hvtToStake <= _stake);

    // Set properly the datasets
    data[_hive].deposited = data[_hive].deposited.add(hvtToStake);
    data[_hive].numMeters = data[_hive].numMeters.add(_numMeters);
    data[_hive].costPerMeter = _meterCost;
    data[_hive].state = State.Active;

    // Deposit the staked HVTs in the vault
    hvt.transferFrom(_hiveOwner, this, hvtToStake);

    Deposited(_hiveOwner, _stake, hvtToStake, _numMeters, _meterCost);
  }

  /**
  * @dev close the staking for a hive
  * @param _hive address hive's address
  * @param _hiveOwner address address of the hive owner
  */
  function close(address _hive, address _hiveOwner) onlyOwner public {
    uint amountToWithdraw = data[_hive].deposited;
    uint numMeters = data[_hive].numMeters;

    // Set properly the datasets
    data[_hive].deposited = data[_hive].deposited.sub(amountToWithdraw);
    data[_hive].numMeters = data[_hive].numMeters.sub(numMeters);
    data[_hive].state = State.Closed;

    // Send the tokens to the hive owner
    hvt.transfer(_hiveOwner, amountToWithdraw);

    Close(_hive, _hiveOwner);
  }

  /**
  * @dev withdraw a part of the staking
  * @param _hive address hive's address
  * @param _hiveOwner address address of the hive owner
  * @param _costs uint[] array containing the costs in HVT for each meter to release
  */
  function withdraw(address _hive, address _hiveOwner, uint[] _costs) onlyOwner public {
    // Check the number of the meters
    require(_costs.length <= data[_hive].numMeters);

    // calculate the amount of HVT to withdraw
    uint256 amountToWithdraw = 0;
    for(uint i=0; i<_costs.length; i++) {
      amountToWithdraw = amountToWithdraw.add(_costs[i]);
    }
    require(amountToWithdraw < data[_hive].deposited);

    // Set properly the dataset
    data[_hive].deposited = data[_hive].deposited.sub(amountToWithdraw);
    data[_hive].numMeters = data[_hive].numMeters.sub(_costs.length);

    // Send the token
    hvt.transfer(_hiveOwner, amountToWithdraw);

    Withdraw(_hive, _hiveOwner, amountToWithdraw, _costs.length);
  }

  /**
  * @dev return the amount of staked HVTs given an address
  * @param _hive address hive address
  */
  function getStakedHVT(address _hive) public view returns(uint) {
    return data[_hive].deposited;
  }

  /**
  * @dev return the status of a hive staking
  * @param _hive address hive address
  */
  function getState(address _hive) public view returns(State) {
    return data[_hive].state;
  }

  /**
  * @dev return the number of meters related to the staking
  * @param _hive address hive address
  */
  function getNumMeters(address _hive) public view returns(uint) {
    return data[_hive].numMeters;
  }
}
