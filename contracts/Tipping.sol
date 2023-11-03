// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./IERC20.sol";

contract Tipping {
    IERC20 public tipToken;
    address public owner;

    event TipSent(address indexed sender, address indexed receiver, uint256 indexed amount);
    event TipTokenChanged(address indexed newTipToken);

    modifier onlyOwner {
        require(msg.sender == owner, "only owner required");
        _;
    }

    constructor(address _tipToken) {
        tipToken = IERC20(_tipToken);
        owner = msg.sender;
    }

    function sendTips(uint256 _amount, address _receiver) external {
        require(tipToken.balanceOf(msg.sender) > _amount, "insufficient funds");

        tipToken.transferFrom(msg.sender, _receiver, _amount);

        emit TipSent(msg.sender, _receiver, _amount);
    }

    function changeTipToken(address _newTipToken) external onlyOwner {
        require(IERC20(_newTipToken) != tipToken, "the same tip token");
        
        tipToken = IERC20(_newTipToken);
        
        emit TipTokenChanged(_newTipToken);
    }
}