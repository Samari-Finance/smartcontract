// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./uniswapinterface.sol";
import "./proxyinterface.sol";

contract ProxyFunctions is Context, IProxyContract, AccessControlEnumerable {
    bytes32 public constant DONATION_WITHDRAW_ROLE =
        keccak256("DONATION_WITHDRAW_ROLE");
    bytes32 public constant MARKETING_WITHDRAW_ROLE =
        keccak256("MARKETING_WITHDRAW_ROLE");
    bytes32 public constant OTHER_WITHDRAW_ROLE =
        keccak256("OTHER_WITHDRAW_ROLE");
    bytes32 public constant TOKEN_ROLE = keccak256("TOKEN_ROLE");

    bytes32 public constant WHALE_ROLE = keccak256("WHALE_ROLE");

    mapping(address => uint256) private _send_amount;
    mapping(address => uint256) private _timer_start;

    //Modifiable values
    //Tokenomics
    uint256 private _min_sell_amount;
    uint256 public  min_sell_pmille = 1;

    uint256 public _liquidityFee = 5;
    uint256 public _donationFee = 2;
    uint256 public _marketingFee = 1;
    uint256 public _otherFee = 0;
    uint256 public _feeTotal = _liquidityFee + _donationFee + _marketingFee + _otherFee;

    uint256 public assessed_balance = 0;
    uint256 public donation_balance = 0;
    uint256 public marketing_balance = 0;
    uint256 public other_balance = 0;
    //Anti whale
    uint256 private _time_limit = 3 hours;
    uint256 private _max_sell_amount;
    uint256 public  max_sell_pmille = 200;


    address private immutable _uniswap_router;

    IERC20 private immutable _token;

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public immutable uniswapV2Pair;
    IUniswapV2Pair private immutable _uniswapV2Pair;

    event TokensReceived(uint256);
    event SwapAndLiquify(uint256, uint256);

    //Needs to be changed
    constructor(address token_address, address uniswap_router) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(DONATION_WITHDRAW_ROLE, _msgSender());
        _setupRole(MARKETING_WITHDRAW_ROLE, _msgSender());
        _setupRole(OTHER_WITHDRAW_ROLE, _msgSender());
        _setupRole(WHALE_ROLE, _msgSender());
        _setupRole(TOKEN_ROLE, token_address);
        _uniswap_router = uniswap_router;
        _token = IERC20(token_address);
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswap_router);
        // Create a uniswap pair for this new token
        address tmp_uniswapV2Pair =
            IUniswapV2Factory(_uniswapV2Router.factory()).createPair(
                token_address,
                _uniswapV2Router.WETH()
            );
        _max_sell_amount = (IERC20(token_address).totalSupply() * max_sell_pmille) / 1000;
        _min_sell_amount = (IERC20(token_address).totalSupply() * min_sell_pmille) / 1000;
        // set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
        _uniswapV2Pair = IUniswapV2Pair(tmp_uniswapV2Pair);
        uniswapV2Pair = tmp_uniswapV2Pair;
    }

    //Anti whale function
    //Cant sell more than x tokens within 3 hours.
    function beforeSend(address sender, address receiver, uint256 amount) external override {
        if(receiver == uniswapV2Pair){
            if (block.timestamp > (_timer_start[sender] + _time_limit)) {
                _timer_start[sender] = block.timestamp;
                _send_amount[sender] = 0;
                require(
                    amount <= _max_sell_amount,
                    "You can't sell this much at once!"
                );
                _send_amount[sender] = amount;
            } else {
                require(
                    amount <= (_max_sell_amount - _send_amount[sender]),
                    "You have reached your sell limit within the cooldown!"
                );
                _send_amount[sender] = _send_amount[sender] + amount;
            }
        }
    }

    //Get pair function since interface cannot contain a variable
    function getPair() external view override returns (address){
        return uniswapV2Pair;
    }

    /**
     * @dev Contract needs to receive/hold BNB.
     */
    receive() external payable {}

    //Function is called after tokens are send to trade to bnb and add liquidity
    function tokensSend(uint256 balance) external override {
        require(
            hasRole(TOKEN_ROLE, msg.sender),
            "You are not allowed to call this function!"
        );

        if (balance < _min_sell_amount) {
            return;
        }
        _token.approve(_uniswap_router, balance);
        // split the LiquidityFee balance into halves
        uint256 liquidityfee = (balance * _liquidityFee) / _feeTotal;
        uint256 otherfees = (balance * (_feeTotal - _liquidityFee)) / _feeTotal;
        
        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        swapTokensForEth(otherfees + (_liquidityFee/2));

        uint256 newBalance = address(this).balance - initialBalance;
        // how much ETH did we just swap into?

        // Find liquidity part of swap
        uint256 liquidityBalance =  (newBalance * _liquidityFee) / (_feeTotal * 2);

        //Everything left over just goes to other fees or is included in next swap
        //Anti whale system should reduce this effect
        addLiquidity(liquidityfee / 2, liquidityBalance);

        // add liquidity to uniswap
        emit TokensReceived(balance);
        emit SwapAndLiquify(liquidityfee / 2, liquidityBalance);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(_token);
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
            address(this),
            block.timestamp
        );
    }

    function modifyAntiWhale(uint256 time_min, uint256 max_pmille) public onlyRole(WHALE_ROLE){
        _time_limit = time_min * 1 minutes;
        _max_sell_amount = (_token.totalSupply() * max_pmille) / 1000;
        max_sell_pmille = max_pmille;
    }
    /*  Calculate price impact to make just one swap in the future   
    function estimated_price_impact(uint256 amount) public {

    } */

    //Withdraw functions
    //First update fee balances and check if enough BNB is in wallet to withdraw. 
    //Remove payed out amount from specefic wallet
    function withdrawDonation(address payable receiver, uint256 amount)
        public
        onlyRole(DONATION_WITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            donation_balance >= amount,
            "There isn't enough BNB in this contract!"
        );
        receiver.transfer(amount);
        donation_balance = donation_balance - amount;
        assessed_balance = assessed_balance - amount;
    }

    function withdrawMarketing(address payable receiver, uint256 amount)
        public
        onlyRole(MARKETING_WITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            marketing_balance >= amount,
            "There isn't enough BNB in this contract!"
        );
        receiver.transfer(amount);
        marketing_balance = marketing_balance - amount;
        assessed_balance = assessed_balance - amount;
    }

    function withdrawOther(address payable receiver, uint256 amount)
        public
        onlyRole(OTHER_WITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            other_balance >= amount,
            "There isn't enough BNB in this contract!"
        );
        receiver.transfer(amount);
        other_balance = other_balance - amount;
        assessed_balance = assessed_balance - amount;
    }

    function withdrawDonationAll(address payable receiver)
        public
        onlyRole(DONATION_WITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(donation_balance > 0, "There isn't enough BNB in this contract!");
        receiver.transfer(donation_balance);
        assessed_balance = 0;
        assessed_balance = assessed_balance - donation_balance;
    }

    function withdrawMarketingAll(address payable receiver)
        public
        onlyRole(MARKETING_WITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(
            marketing_balance > 0,
            "There isn't enough BNB in this contract!"
        );
        receiver.transfer(marketing_balance);
        marketing_balance = 0;
        assessed_balance = assessed_balance - marketing_balance;
    }

    function withdrawOtherAll(address payable receiver)
        public
        onlyRole(OTHER_WITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(other_balance > 0, "There isn't enough BNB in this contract!");
        receiver.transfer(other_balance);
        other_balance = 0;
        assessed_balance = assessed_balance - other_balance;
    }

    //Update fees for contract
    function updateFees(
        uint256 donation,
        uint256 marketing,
        uint256 liquidity,
        uint256 other
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        updateFeeBalances();
        _donationFee = donation;
        _marketingFee = marketing;
        _liquidityFee = liquidity;
        _otherFee = other;
        _feeTotal = _donationFee + _marketingFee + _liquidityFee + _otherFee;
    }

    //Update balances for different fee accounts to keep track of how much there is left for which fee
    function updateFeeBalances() private {
        uint256 not_assessed = address(this).balance - assessed_balance;
        if(not_assessed > 0){
            uint256 fee_total = _donationFee + _marketingFee + _otherFee;
            uint256 added_donation_balance = ((_otherFee > 0) ? ((not_assessed * _donationFee) / fee_total): 0);
            uint256 added_marketing_balance = ((_otherFee > 0) ? ((not_assessed * _marketingFee) / fee_total) : 0);
            uint256 added_other_balance = ((_otherFee > 0) ? ((not_assessed * _otherFee) / fee_total) : 0);
            donation_balance = donation_balance + added_donation_balance;
            marketing_balance = marketing_balance + added_marketing_balance;
            other_balance = other_balance + added_other_balance;
            assessed_balance =
                assessed_balance +
                added_other_balance +
                added_marketing_balance +
                added_donation_balance;
        }

    }
}
