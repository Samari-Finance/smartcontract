// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./uniswapinterface.sol";
import "./proxyinterface.sol";

contract ProxyFunctionsV2 is Context, IproxyContract, AccessControlEnumerable {
    bytes32 public constant DONTATIONWITHDRAW_ROLE =
        keccak256("DONTATIONWITHDRAW_ROLE");
    bytes32 public constant MARKETINGWITHDRAW_ROLE =
        keccak256("MARKETINGWITHDRAW_ROLE");
    bytes32 public constant OTHERWITHDRAW_ROLE =
        keccak256("OTHERWITHDRAW_ROLE");
    bytes32 public constant TOKEN_ROLE = keccak256("TOKEN_ROLE");

    bytes32 public constant WHALE_ROLE = keccak256("WHALE_ROLE");

    bytes32 public constant FEE_ROLE = keccak256("FEE_ROLE");

    mapping(address => uint256) private _sendamount;
    mapping(address => uint256) private _timerstart;

    //Modifiable values
    //Tocenomics
    uint256 private _minimumsellamount;
    uint256 public minsellpermille = 1;

    uint256 public _liquidityFee = 5;
    uint256 public _donationFee = 2;
    uint256 public _marketingFee = 1;
    uint256 public _otherFee = 0;
    uint256 public _feeTotal =
        _liquidityFee + _donationFee + _marketingFee + _otherFee;

    uint256 public assesedbalance = 0;
    uint256 public asseseddonationbalance = 0;
    uint256 public assesedmarketingbalance = 0;
    uint256 public assesedotherbalance = 0;
    //Antiwhale
    uint256 private _timelimit = 1 hours;
    uint256 private _maxsellamount;
    uint256 public maxsellpermille = 10;

    address private immutable _uniswaprouter;

    IERC20 private immutable _token;

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public immutable uniswapV2Pair;
    IUniswapV2Pair private immutable _uniswapV2Pair;

    event TokensRecieved(uint256);
    event SwapAndLiquify(uint256, uint256);

    //Needs to be changed
    constructor(
        address tokenaddress,
        address uniswaprouter,
        address uniswappair
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(DONTATIONWITHDRAW_ROLE, _msgSender());
        _setupRole(MARKETINGWITHDRAW_ROLE, _msgSender());
        _setupRole(OTHERWITHDRAW_ROLE, _msgSender());
        _setupRole(WHALE_ROLE, _msgSender());
        _setupRole(FEE_ROLE, _msgSender());
        _setupRole(TOKEN_ROLE, tokenaddress);
        _uniswaprouter = uniswaprouter;
        _token = IERC20(tokenaddress);
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswaprouter);
        //Create a uniswap pair for this new token
        // address tmpuniswapV2Pair =
        //     IUniswapV2Factory(_uniswapV2Router.factory()).createPair(
        //         tokenaddress,
        //         _uniswapV2Router.WETH()
        //     );
        _maxsellamount =
            (IERC20(tokenaddress).totalSupply() * maxsellpermille) /
            1000;
        _minimumsellamount =
            (IERC20(tokenaddress).totalSupply() * minsellpermille) /
            1000;
        // set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
        _uniswapV2Pair = IUniswapV2Pair(uniswappair);
        uniswapV2Pair = uniswappair;
    }

    //Anti whale function
    //Cant sell more than x tokens within 3 hours.
    function beforeSend(
        address sender,
        address reciever,
        uint256 amount
    ) external override {
        require(
            hasRole(TOKEN_ROLE, msg.sender),
            "You are not allowed to call this function!"
        );
        if (reciever == uniswapV2Pair) {
            if (block.timestamp >= (_timerstart[sender] + _timelimit)) {
                _timerstart[sender] = block.timestamp;
                _sendamount[sender] = 0;
            }
            require(
                amount <= (_maxsellamount - _sendamount[sender]),
                "You have reached your sell limit!"
            );
            _sendamount[sender] = _sendamount[sender] + amount;
        }
    }

    //Get pair function since interface cant cointain a varaible
    function getPair() external view override returns (address) {
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

        //Dont sell if collected amount of tokens is very small and dont sell more than a max amount
        if (balance < _minimumsellamount) {
            return;
        }

        if (balance > _maxsellamount) {
            balance = _maxsellamount;
        }
        _token.approve(_uniswaprouter, balance);
        // split the LiquidityFee balance into halves
        uint256 liquidityfee = (balance * _liquidityFee) / _feeTotal;
        uint256 otherfees = (balance * (_feeTotal - _liquidityFee)) / _feeTotal;

        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        swapTokensForEth(otherfees + (_liquidityFee / 2));

        uint256 newBalance = address(this).balance - initialBalance;
        // how much ETH did we just swap into?

        // Find liquiditypart of swap
        uint256 liquidityBalance =
            (newBalance * _liquidityFee) / (_feeTotal * 2);

        //Everything thats left over just goes to other fees or is included in next swap
        //Anti whale system should reduce this effect
        addLiquidity(liquidityfee / 2, liquidityBalance);

        // add liquidity to uniswap
        emit TokensRecieved(balance);
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

    //Withdraw liquidity in case of emergency
    function withdrawLiquidity(address reciever)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 balance = _uniswapV2Pair.balanceOf(address(this));
        _uniswapV2Pair.transfer(reciever, balance);
    }

    function modifyAntiWhale(uint256 time_min, uint256 maxpermille)
        public
        onlyRole(WHALE_ROLE)
    {
        _timelimit = time_min * 1 minutes;
        _maxsellamount = (_token.totalSupply() * maxpermille) / 1000;
        maxsellpermille = maxpermille;
    }

    //Withdraw functions
    //First update fee balances and check if enough BNB is in wallet to withdraw.
    //Remove payed out amount from specefic wallet
    function withdrawDonation(address payable reciever, uint256 amount)
        public
        onlyRole(DONTATIONWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            asseseddonationbalance >= amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        asseseddonationbalance = asseseddonationbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawMarketing(address payable reciever, uint256 amount)
        public
        onlyRole(MARKETINGWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            assesedmarketingbalance >= amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        assesedmarketingbalance = assesedmarketingbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawOther(address payable reciever, uint256 amount)
        public
        onlyRole(OTHERWITHDRAW_ROLE)
    {
        require(amount > 0, "You need to send more than 0!");
        updateFeeBalances();
        require(
            assesedotherbalance >= amount,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(amount);
        assesedotherbalance = assesedotherbalance - amount;
        assesedbalance = assesedbalance - amount;
    }

    function withdrawDonationAll(address payable reciever)
        public
        onlyRole(DONTATIONWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(
            asseseddonationbalance > 0,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(asseseddonationbalance);
        assesedbalance = assesedbalance - asseseddonationbalance;
        asseseddonationbalance = 0;
    }

    function withdrawMarketingAll(address payable reciever)
        public
        onlyRole(MARKETINGWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(
            assesedmarketingbalance > 0,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(assesedmarketingbalance);
        assesedbalance = assesedbalance - assesedmarketingbalance;
        assesedmarketingbalance = 0;
    }

    function withdrawOtherAll(address payable reciever)
        public
        onlyRole(OTHERWITHDRAW_ROLE)
    {
        updateFeeBalances();
        require(
            assesedotherbalance > 0,
            "There isnt enough BNB in this contract!"
        );
        reciever.transfer(assesedotherbalance);
        assesedbalance = assesedbalance - assesedotherbalance;
        assesedotherbalance = 0;
    }

    //Show balances of contract without writing to contract

    function showMarketingBalance() public view returns (uint256) {
        uint256 balance;
        (, balance, , ) = getBalances();
        return balance;
    }

    function showDonationBalance() public view returns (uint256) {
        uint256 balance;
        (balance, , , ) = getBalances();
        return balance;
    }

    function showOtherBalance() public view returns (uint256) {
        uint256 balance;
        (, , balance, ) = getBalances();
        return balance;
    }

    //Update fees for contract
    function updateFees(
        uint256 donation,
        uint256 marketing,
        uint256 liquidity,
        uint256 other
    ) public onlyRole(FEE_ROLE) {
        updateFeeBalances();
        _donationFee = donation;
        _marketingFee = marketing;
        _liquidityFee = liquidity;
        _otherFee = other;
        _feeTotal = _donationFee + _marketingFee + _liquidityFee + _otherFee;
    }

    //Update balances for different fee accounts to keep track of how much there is left for which fee
    //Write updated balances to contract
    function updateFeeBalances() private {
        uint256 _donationbalance;
        uint256 _marketingbalance;
        uint256 _otherbalance;
        uint256 _assesedbalance;
        (
            _donationbalance,
            _marketingbalance,
            _otherbalance,
            _assesedbalance
        ) = getBalances();
        asseseddonationbalance = _donationbalance;
        assesedmarketingbalance = _marketingbalance;
        assesedotherbalance = _otherbalance;
        assesedbalance = _assesedbalance;
    }

    function getBalances()
        private
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 notassesed = address(this).balance - assesedbalance;
        uint256 _donationbalance;
        uint256 _marketingbalance;
        uint256 _otherbalance;
        uint256 _assesedbalance;
        uint256 tmpfeetotal = _donationFee + _marketingFee + _otherFee;
        //Check if balances are already up to date and avoid rounding error
        if (notassesed >= tmpfeetotal) {
            //Calculate updated balances
            //to avoid rounding errors
            //Find added balances based on not assesed amount and fees
            uint256 addeddonationbalance =
                (
                    (_donationFee > 0)
                        ? ((notassesed * _donationFee) / tmpfeetotal)
                        : 0
                );
            uint256 addedmarketingbalance =
                (
                    (_marketingFee > 0)
                        ? ((notassesed * _marketingFee) / tmpfeetotal)
                        : 0
                );
            uint256 addedotherbalance =
                (
                    (_otherFee > 0)
                        ? ((notassesed * _otherFee) / tmpfeetotal)
                        : 0
                );

            _donationbalance = asseseddonationbalance + addeddonationbalance;
            _marketingbalance = assesedmarketingbalance + addedmarketingbalance;
            _otherbalance = assesedotherbalance + addedotherbalance;
            _assesedbalance =
                assesedbalance +
                addedotherbalance +
                addedmarketingbalance +
                addeddonationbalance;
            return (
                _donationbalance,
                _marketingbalance,
                _otherbalance,
                _assesedbalance
            );
        }
        _donationbalance = asseseddonationbalance;
        _marketingbalance = assesedmarketingbalance;
        _otherbalance = assesedotherbalance;
        _assesedbalance = assesedbalance;
        return (
            _donationbalance,
            _marketingbalance,
            _otherbalance,
            _assesedbalance
        );
    }
}
