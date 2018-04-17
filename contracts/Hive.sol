pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'contracts/Tariff.sol';
import 'contracts/MeterList.sol';
import 'contracts/HiveList.sol';
import 'contracts/TokenVault.sol';
import 'third-party/ethereum-datetime/contracts/DateTime.sol';

contract Hive is Ownable{
  using SafeMath for uint256;
  enum PaymentType {Deposit, Withdrawal}

  struct Payment{
    PaymentType paymentType;
    uint256 tokenAmount;
    bytes32 energyHash;
  }

  struct Energy{
    bytes32 tariffName;
    uint256 energyAmount;
  }

  mapping (address => mapping(uint256 => Energy[])) energy;
  mapping (address => mapping(uint256 => bool)) hasSentEnergy;
  mapping (address => bool) isMeter;
  address hiveOwner;
  Tariff tariff;
  TokenVault tokenVault;
  DateTime dateTime;
  MeterList meterList;
  HiveList hiveList;
  address[] meters;

  modifier notNull(address _address) {
    require(_address != 0);
    _;
  }

  modifier meterDoesNotExist(address meter) {
    require(!isMeter[meter]);
    _;
  }

  modifier meterExists(address meter) {
    require(isMeter[meter]);
    _;
  }

  modifier hiveActive() {
    HiveList.HiveStatus status = hiveList.getStatus(address(this));
    require(status == HiveList.HiveStatus.Active);
    _;
  }

  event MeterAddition(address meter);
  event MeterRemoved(address meter);
  event TempPassedInitialTests();

  function Hive(address _tokenVault, address _tariff, address _dateTime, address _meterList, address _hiveList) public {
    require(_tariff != address(0));
    require(_dateTime != address(0));
    require(_meterList != address(0));
    require(_hiveList != address(0));
    tariff = Tariff(_tariff);
    tokenVault = TokenVault(_tokenVault);
    dateTime = DateTime(_dateTime);
    meterList = MeterList(_meterList);
    hiveList = HiveList(_hiveList);
  }

  function addMeters(address[] _meters) public
  onlyOwner {
    for (uint i=0; i<_meters.length; i++) {
      addMeter(_meters[i]);
    }
  }

  function addMeter(address _meter) public
  onlyOwner
  meterDoesNotExist(_meter)
  notNull(_meter) {
    isMeter[_meter] = true;
    meters.push(_meter);
    MeterAddition(_meter);
  }

  function removeMeters(address[] _meters) public
  onlyOwner
  {
    for (uint i=0; i<_meters.length; i++) {
      removeMeter(_meters[i]);
    }
  }

  function removeMeter(address _meter) public
  onlyOwner
  meterExists(_meter) {
    isMeter[_meter] = false;
    for (uint i=0; i<meters.length - 1; i++) {
      if (meters[i] == _meter) {
        meters[i] = meters[meters.length - 1];
        break;
      }
    }
    meters.length -= 1;
    MeterRemoved(_meter);
  }

  function sendEnergy(bytes32[] _tariffName, uint256[] _energyAmount, uint256 slot) hiveActive public {
    //check if meter is part of hive
    require(meterList.getMeterHive(msg.sender) == address(this));
    require(!hasSentEnergy[msg.sender][slot]);
    require(_tariffName.length == _energyAmount.length);

    delete energy[msg.sender][slot];
    for (uint i=0; i<_tariffName.length; i++){
      require(tariff.isTariff(_tariffName[i]));
      energy[msg.sender][slot].push(Energy(_tariffName[i],_energyAmount[i]));
    }

    // calculate payments
    uint256 to_pay;
    uint256 to_receive;
    (to_pay, to_receive)=calculateMoneyFLow(energy[msg.sender][slot]);

    // pay
    if (to_pay>to_receive){
      tokenVault.withdraw(msg.sender,address(this),to_pay.sub(to_receive));
    }
    else{
      tokenVault.withdraw(address(this),msg.sender,to_receive.sub(to_pay));
    }

    // energy was sent and paid successfully
    hasSentEnergy[msg.sender][slot] = true;
  }

  function getLastSlot() view public returns (uint256 lastSlot){
    lastSlot = getCurrentSlot().sub(1);
  }

  function getCurrentSlot() view public returns (uint256 currentSlot){
  uint256 timestamp = now;
  uint256 year = dateTime.getYear(timestamp);
  uint256 month = dateTime.getMonth(timestamp);
  currentSlot = (year.mul(12)).add(month);
  }

  function getMeters() view public returns (address[]) {
    return(meters);
  }

  function calculateMoneyFLow(Energy[] _energy) internal view returns(uint256, uint256){
    uint256 to_pay=0;
    uint256 to_receive=0;
    uint price;
    Tariff.TariffType tariffType;
    for (uint i=0; i<_energy.length; i++){
      (price, tariffType) = tariff.getTariff(_energy[i].tariffName);
      if (tariffType == Tariff.TariffType.Buy){
        to_pay = to_pay.add(price.mul(_energy[i].energyAmount));
      }
      else{
        to_receive = to_receive.add(price.mul(_energy[i].energyAmount));
      }
    }
    return(to_pay, to_receive);
  }
}
