// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/access/AccessControl.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./uniswapinterface.sol";
import "./proxyinterface.sol";

contract ProxyFunctions is Context, AccessControl, IproxyContract {
    //TODO: Add withdrawer roles for different withdrawals
    //Acces roles
    bytes32 public constant DONTATIONWITHDRAW_ROLE =
        keccak256("DONTATIONWITHDRAW_ROLE");
    bytes32 public constant MARKETINGWITHDRAW_ROLE =
        keccak256("MARKETINGWITHDRAW_ROLE");
    bytes32 public constant OTHERWITHDRAW_ROLE =
        keccak256("OTHERWITHDRAW_ROLE");
    bytes32 public constant TOKEN_ROLE = keccak256("TOKEN_ROLE");

    mapping(address => uint256) private _sendamount;
    mapping(address => uint256) private _timerstart;

    //Modifiable values
    //Tocenomics
    //Need to be 100 in total
    uint8 private decimals = 9;
    uint256 public minimumsellamount = 12407274 * 10**decimals;

    uint256 public _liquidityFee = 50;
    uint256 public _donationFee = 20;
    uint256 public _marketingFee = 20;
    uint256 public _otherFee = 10;

    uint256 public assesedbalance = 0;
    uint256 public donationbalance = 0;
    uint256 public marketingbalance = 0;
    uint256 public otherbalance = 0;
    //Antiwhale
    uint256 private _timelimit = 3 hours;
    uint256 private _maxsellamount = 32407274488 * 10**decimals;

    address private immutable _uniswaprouter; //testnet value

    IERC20 private immutable _token;

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public immutable uniswapV2Pair;
    IUniswapV2Pair private immutable _uniswapV2Pair;

    event TokensRecieved(uint256);
    event SwapAndLiquify(uint256, uint256);

    //Needs to be changed
    constructor(address tokenaddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(DONTATIONWITHDRAW_ROLE, _msgSender());
        _setupRole(MARKETINGWITHDRAW_ROLE, _msgSender());
        _setupRole(OTHERWITHDRAW_ROLE, _msgSender());
        _setupRole(TOKEN_ROLE, tokenaddress);
        address uniswaprouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
        _uniswaprouter = uniswaprouter;
        _token = IERC20(tokenaddress);
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswaprouter);
        // Create a uniswap pair for this new token
        address tmpuniswapV2Pair =
            IUniswapV2Factory(_uniswapV2Router.factory()).createPair(
                tokenaddress,
                _uniswapV2Router.WETH()
            );
        // set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
        _uniswapV2Pair = IUniswapV2Pair(tmpuniswapV2Pair);
        uniswapV2Pair = tmpuniswapV2Pair;
    }

    //Anti whale function
    function beforeSend(address sender, uint256 amount) external override {
        if (block.timestamp > (_timerstart[sender] + _timelimit)) {
            _timerstart[sender] = block.timestamp;
            _sendamount[sender] = 0;
            require(
                amount <= _maxsellamount,
                "You can't sell this much at once!"
            );
            _sendamount[sender] = amount;
        } else {
            require(
                amount <= (_maxsellamount - _sendamount[sender]),
                "You have reached your sell limit within the cooldown!"
            );
        }
    }

    /**
     * @dev Contract needs to receive/hold BNB.
     */
    receive() external payable {}

    //Function is called after tokens are send to trade to bnb and add liquidity
    function tokensSend(uint256 amount) external override {
        require(
            hasRole(TOKEN_ROLE, msg.sender),
            "You are not allowed to call this function!"
        );
        if (amount == 0) {
            emit TokensRecieved(0);
            return;
        }
        uint256 balance = _token.balanceOf(address(this));
        _token.approve(_uniswaprouter, amount);
        require(balance >= amount, "An error occured in proxy contract!");
        if (balance < minimumsellamount) {
            return;
        }
        // split the LiquidityFee balance into halves
        uint256 liquidityfee = (balance * _liquidityFee) / 100;
        uint256 otherfees = (balance * (100 - _liquidityFee)) / 100;

        swapTokensForEth(otherfees);
        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        // swap tokens for ETH
        swapTokensForEth(liquidityfee / 2); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

        uint256 newBalance = address(this).balance - initialBalance;

        addLiquidity(liquidityfee / 2, newBalance);
        // how much ETH did we just swap into?

        // add liquidity to uniswap
        emit TokensRecieved(amount);
        emit SwapAndLiquify(liquidityfee / 2, newBalance);
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
            address(0),
            block.timestamp
        );
    }

    /*  Calculate price impact to make just one swap in the future   
    function priceimpactcalculator(uint256 amount) public {

    } */

    function withdrawDonation(address payable reciever, uint256 amount)
        public
        onlyRole(DONTATIONWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            donationbalance < amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        donationbalance = donationbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawMarketing(address payable reciever, uint256 amount)
        public
        onlyRole(MARKETINGWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            marketingbalance < amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        marketingbalance = marketingbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawOther(address payable reciever, uint256 amount)
        public
        onlyRole(OTHERWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            otherbalance < amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        otherbalance = otherbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawDonationAll(address payable reciever)
        public
        onlyRole(DONTATIONWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(assesedbalance > 0, "There isnt enough BNB in this contract!");
        reciever.transfer(assesedbalance);
        assesedbalance = 0;
        assesedbalance = assesedbalance - assesedbalance;
    }

    function withdrawMarketingAll(address payable reciever)
        public
        onlyRole(MARKETINGWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(
            marketingbalance > 0,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(marketingbalance);
        marketingbalance = 0;
        assesedbalance = assesedbalance - marketingbalance;
    }

    function withdrawOtherAll(address payable reciever)
        public
        onlyRole(OTHERWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(otherbalance > 0, "There isnt enough BNB in this contract!");
        reciever.transfer(otherbalance);
        otherbalance = 0;
        assesedbalance = assesedbalance - otherbalance;
    }

    function updateFees(
        uint256 donation,
        uint256 marketing,
        uint256 liquidity,
        uint256 other
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            donation + marketing + liquidity + other == 100,
            "The fees must give 100 in total!"
        );
        updateFeeBalances();
        _donationFee = donation;
        _marketingFee = marketing;
        _liquidityFee = liquidity;
        _otherFee = other;
    }

    function updateFeeBalances() private {
        uint256 notassesed = address(this).balance - assesedbalance;
        uint256 feetotal = _donationFee + _marketingFee + _otherFee;
        uint256 addeddonationbalance = (notassesed * _donationFee) / feetotal;
        uint256 addedmarketingbalance = (notassesed * _marketingFee) / feetotal;
        uint256 addedotherbalance = (notassesed * _otherFee) / feetotal;
        donationbalance = donationbalance + addeddonationbalance;
        marketingbalance = marketingbalance + addedmarketingbalance;
        otherbalance = otherbalance + addedotherbalance;
        assesedbalance =
            assesedbalance +
            addedotherbalance +
            addedmarketingbalance +
            addeddonationbalance;
    }
}
