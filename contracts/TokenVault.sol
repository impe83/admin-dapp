pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'contracts/HiveList.sol';
import 'contracts/MeterList.sol';


/**
 * @title TokenVault
 */

contract TokenVault is Ownable {
  using SafeMath for uint256;

  mapping (address => uint256) public deposited;
  HiveList hiveList;
  MeterList meterList;
  ERC20 token;

  event Closed();
  event RefundsEnabled();
  event Deposited(address indexed worker, uint256 amount);
  event DepositCanceled(address indexed worker, uint256 amount);
  event Withdrawn(address from, address to, uint256 amount);

  /**
   * @param _hiveList Hive list address
   * @param _meterList Meter list address
   * @param _token token address
   */
  function TokenVault(address _hiveList, address _meterList, address _token) public {
    require(_hiveList != address(0));
    require(_token != address(0));
    hiveList = HiveList(_hiveList);
    meterList = MeterList(_meterList);
    token = ERC20(_token);
  }

  /**
   * @param _meter Meter address
   * @param _hive Hive address
   */
  function deposit(address _meter, address _hive) public {
    //hive is Active
    require(hiveList.getStatus(_hive) == HiveList.HiveStatus.Active);
      //sender if the owner of the meter
    require(msg.sender == meterList.getMeterUser(_meter));
      // meter is in the hive
    require(meterList.getMeterHive(_meter) == _hive);
    uint allowed = token.allowance(msg.sender, this);
    deposited[_meter] = deposited[_meter].add(allowed);
    token.transferFrom(msg.sender,this,allowed);
    Deposited(msg.sender, allowed);
  }

  /**
   * @param _hive Hive address
   */
  function depositHiveOwner(address _hive) public {
    //hive is Active
    require(hiveList.getStatus(_hive) == HiveList.HiveStatus.Active);
    //sender is the hive owner
    require(msg.sender == hiveList.getOwner(_hive));
    uint allowed = token.allowance(msg.sender, this);
    deposited[_hive] = deposited[_hive].add(allowed);
    token.transferFrom(msg.sender,this,allowed);
    Deposited(msg.sender, allowed);
  }

  /**
   * @param _from Meter or Hive address
   * @param _to Meter or Hive address
   * @param _amount token to transfer
   */
  function withdraw(address _from, address _to, uint256 _amount) public {
    //checks
    require(deposited[_from] >= _amount);
    require(_from!=_to);
    // if it's a meter, it should be a meter of the hive
    if(meterList.isMeterRegistered(_from)){
      require(msg.sender == meterList.getMeterHive(_from));
    }
    // otherwise it should be the hive itself
    else{
      require(_from == msg.sender);
    }
    // if it's a meter, it should be a meter of the hive
    if(meterList.isMeterRegistered(_to)){
      require(msg.sender == meterList.getMeterHive(_to));
    }
    // otherwise it should be the hive itself
    else{
      require(_to == msg.sender);
    }

    // subtract wei from the payer's account
    deposited[_from] = deposited[_from].sub(_amount);

    //sending from meter to hiveOwner
    if(msg.sender == _to){
      address hiveOwner = hiveList.getOwner(_to);
      token.transfer(hiveOwner, _amount);
    }
    //sending from hiveOwner to meter or from meter to meter
    else {
      address meterUser = meterList.getMeterUser(_to);
      token.transfer(meterUser, _amount);
    }

    Withdrawn(_from, _to, _amount);
  }

  /**
   * @param _user Meter or Hive address
   */
  function balanceOf(address _user) view public returns(uint256){
    return(deposited[_user]);
  }

  // ------------------------------------------------------------------------
  // Don't accept ETH
  // ------------------------------------------------------------------------
  function () public payable {
     revert();
  }
}
