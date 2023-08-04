//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Dex {
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

    enum Side {
        BUY, SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }

    bytes32 constant public DAI_TICKER = bytes32("DAI");
    mapping(bytes32 => Token) public tokens;
    bytes32[] public tokenList;
    mapping (address=>mapping(bytes32=>uint)) public traderBalance;
    mapping (bytes32 => mapping(uint => Order[])) public orderBook;
    address public admin;
    uint public nextOrderId;
    uint public nextTradeId;

    event NewTrade(uint tradeId, uint orderId, bytes32 indexed ticker, address indexed trader1, address indexed trader2, uint amount,
                    uint price, uint date);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier tokenExist(bytes32 _ticker) {
        require(tokens[_ticker].tokenAddress != address(0), "token does not exist");
        _;
    }
    
    modifier tokenIsNotDai(bytes32 _ticker) {
        require(_ticker != DAI_TICKER, "cannot trade DAI");
        _;
    }

    function addToken(bytes32 _ticker, address _tokenAddress) external onlyAdmin() {
        tokens[_ticker] = Token(_ticker, _tokenAddress);
        tokenList.push(_ticker);
    }

    function deposit(uint _amount, bytes32 _ticker) payable external tokenExist(_ticker) {
        IERC20(tokens[_ticker].tokenAddress)
            .transferFrom(msg.sender,address(this), _amount);
        traderBalance[msg.sender][_ticker] += _amount;
    }

    function withdraw(uint _amount, bytes32 _ticker) external tokenExist(_ticker) {
        require(traderBalance[msg.sender][_ticker] >= _amount, "balance too low");

        traderBalance[msg.sender][_ticker] -= _amount;
        IERC20(tokens[_ticker].tokenAddress).transfer(msg.sender, _amount);
    }

    function createLimitOrder(
        bytes32 _ticker,
        uint _amount,
        uint _price,
        Side _side
    ) external tokenExist(_ticker) tokenIsNotDai(_ticker) {
        if (_side == Side.SELL) {
            //SELL CASE
            require(
                traderBalance[msg.sender][_ticker] >= _amount, 
                "token balance too low");
        } else {
            require(
                traderBalance[msg.sender][DAI_TICKER] >= _amount * _price,
                "DAI balance too low");
        }

        Order[] storage orders = orderBook[_ticker][uint(_side)];
        orders.push(Order(
            nextOrderId,
            msg.sender,
            _side,
            _ticker,
            _amount,
            0,
            _price,
            block.timestamp
        ));
        uint i = orders.length - 1;
        while (i > 0) {
            if (_side == Side.SELL && orders[i-1].price < orders[i].price) {
                break;
            }
            if (_side == Side.BUY && orders[i-1].price > orders[i].price) {
                break;
            }
            Order memory order = orders[i-1];
            orders[i-1] = orders[i];
            orders[i] = order;
            i--;
        }

        nextOrderId++;
    }

    function createMarketOrder(
        bytes32 _ticker,
        uint _amount,
        Side _side) external tokenExist(_ticker) tokenIsNotDai(_ticker) {
            if (_side == Side.SELL) {
            //SELL CASE
            require(
                traderBalance[msg.sender][_ticker] >= _amount, 
                "token balance too low");
        }

        Order[] storage orders = orderBook[_ticker][uint(_side == Side.SELL ? Side.BUY : Side.SELL)];
        uint i;
        uint remaining= _amount;
        while (i < orders.length && remaining > 0) {
            Order storage order = orders[i];
            uint available = order.amount - order.filled;
            uint matched = (remaining > available) ? available : remaining;
            remaining -= matched;
            emit NewTrade(nextTradeId, order.id, _ticker, order.trader, msg.sender, matched, 
                        order.price, block.timestamp);
            if (_side == Side.SELL) {
                traderBalance[msg.sender][_ticker] -= matched;
                traderBalance[msg.sender][DAI_TICKER] += matched * order.price;
                traderBalance[order.trader][_ticker] += matched;
                traderBalance[order.trader][DAI_TICKER] -= matched * order.price;
            }
            if (_side == Side.BUY) {
                require(
                    traderBalance[msg.sender][DAI_TICKER] >= (matched * order.price), 
                    "DAI balance too low");
                traderBalance[msg.sender][_ticker] += matched;
                traderBalance[msg.sender][DAI_TICKER] -= matched * order.price;
                traderBalance[order.trader][_ticker] -= matched;
                traderBalance[order.trader][DAI_TICKER] += matched * order.price;
            }
            nextTradeId++;
            i++;
        }
        i = 0;
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint k = i; k < orders.length - 1; k++) {
                orders[k] = orders[k + 1];
            }
            orders.pop();
            i++;
        }
    }
}