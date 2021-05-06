// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



import "../node_modules/@openzeppelin/contracts/access/AccessControl.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./uniswapinterface.sol";

interface otherFeeReciever {
    function tokensSend(uint256) external;
}

contract feeProxy is Context, AccessControl, otherFeeReciever  {
    
        //Modifiable values
        //Need to be 100 in total
        uint256 public minimumsellamount = 10 * 10**6 * 10**9;

        uint256 public _liquidityFee = 50;
        uint256 public _donationFee = 20;
        uint256 public _marketingFee = 20;
        uint256 public _otherFee = 10;

        address private immutable _uniswaprouter; //testnet value
        
        IERC20 private immutable _token;

        IUniswapV2Router02 public immutable uniswapV2Router;
        address public immutable uniswapV2Pair;
        IUniswapV2Pair private immutable _uniswapV2Pair;

        event TokensRecieved(uint256);
        event SwapAndLiquify(uint256, uint256);

        //Needs to be changed
        constructor (address tokenaddress) { 
            address uniswaprouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
            _uniswaprouter = uniswaprouter;
            _token = IERC20(tokenaddress);    
            IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswaprouter);
            // Create a uniswap pair for this new token
            address tmpuniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
            .createPair(tokenaddress, _uniswapV2Router.WETH());
            // set the rest of the contract variables
            uniswapV2Router = _uniswapV2Router;
            _uniswapV2Pair = IUniswapV2Pair(tmpuniswapV2Pair);
            uniswapV2Pair = tmpuniswapV2Pair;
        }
        
        /**
        * @dev Contract needs to receive/hold BNB.
        */
        receive() external payable {}
        
        function tokensSend(uint256 amount) external override {
            if(amount == 0){
                emit TokensRecieved(0);
                return;
            }
            emit TokensRecieved(amount);
            uint256 balance = _token.balanceOf(address(this));
            if(balance < minimumsellamount){
                return;
            }
            // split the contract balance into halves
            uint256 liquidityfee = balance * _liquidityFee / 100;
            uint256 otherfees = balance * (100-_liquidityFee) / 100;

            swapTokensForEth(otherfees);
            // capture the contract's current ETH balance.
            // this is so that we can capture exactly the amount of ETH that the
            // swap creates, and not make the liquidity event include any ETH that
            // has been manually sent to the contract
            uint256 initialBalance = address(this).balance;

            // swap tokens for ETH
            swapTokensForEth(liquidityfee/2); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

            uint256 newBalance = address(this).balance - initialBalance;
            
            addLiquidity(liquidityfee/2, newBalance);
            // how much ETH did we just swap into?

            // add liquidity to uniswap
            
            emit SwapAndLiquify(liquidityfee/2, newBalance);
        }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        // make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        // approve token transfer to cover all possible scenarios

        // add the liquidity
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(_token),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            address(0),
            block.timestamp
        );
    }

/*  Calculate price impact to make just one swap in the future   
    function priceimpactcalculator(uint256 amount) public {

    } */

    function send(address payable reciever, uint256 amount) public {
            require(amount > 0, "You need to send more than 0!");
            require(address(this).balance <= amount, "There isnt enough BNB in this contract!");
            reciever.transfer(amount);
    }
        
    function sendMax(address payable reciever) public {
            require(address(this).balance > 0, "There is no BNB in this contract!");
            reciever.transfer(address(this).balance);
    }
        
}