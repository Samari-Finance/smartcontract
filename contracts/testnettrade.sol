pragma solidity ^0.8.0;

import "./uniswapinterface.sol";

contract UniswapExample {
  address internal constant UNISWAP_ROUTER_ADDRESS = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1 ;

  IUniswapV2Router02 public uniswapRouter;
  address private multiDaiKovan;

  constructor(address token) {
    multiDaiKovan = token;
    uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
  }

  function convertEthToDai(uint daiAmount) public payable {
    uint deadline = block.timestamp + 15; // using 'now' for convenience, for mainnet pass deadline from frontend!
    uniswapRouter.swapETHForExactTokens{ value: msg.value }(daiAmount, getPathForETHtoDAI(), address(this), deadline);
    
    // refund leftover ETH to user
    (bool success,) = msg.sender.call{ value: address(this).balance }("");
    require(success, "refund failed");
  }
  
  function getEstimatedETHforDAI(uint daiAmount) public view returns (uint[] memory) {
    return uniswapRouter.getAmountsIn(daiAmount, getPathForETHtoDAI());
  }

  function getPathForETHtoDAI() private view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = multiDaiKovan;
    path[1] = uniswapRouter.WETH();
    
    return path;
  }
  
  // important to receive ETH
  receive() payable external {}
}