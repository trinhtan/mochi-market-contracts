// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "../libraries/helpers/Errors.sol";
import "../libraries/types/DataTypes.sol";
import "../libraries/logic/NFTInfoLogic.sol";
import "../interfaces/IAddressesProvider.sol";
import "../libraries/helpers/ArrayLib.sol";

/**
 * @title NFTList contract
 * @dev Agencies for users to register nft address and market admin will accept so that they can be sell / buy / exchange on the Market.
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract NFTList is Initializable {
    using SafeMath for uint256;
    using NFTInfoLogic for DataTypes.NFTInfo;
    using ArrayLib for uint256[];

    IAddressesProvider public addressesProvider;

    mapping(address => DataTypes.NFTInfo) internal _nftToInfo;
    address[] internal _nftsList;
    uint256[] internal _acceptedList;

    event Initialized(address indexed provider);
    event NFTRegistered(address indexed nftAddress, bool erc1155);
    event NFTAccepted(address indexed nftAddress);
    event NFTAdded(address indexed nftAddress, bool erc1155);

    modifier onlyMarketAdmin() {
        require(addressesProvider.getAdmin() == msg.sender, Errors.CALLER_NOT_MARKET_ADMIN);
        _;
    }

    modifier onlyCreativeStudio {
        require(
            addressesProvider.getCreativeStudio() == msg.sender,
            Errors.CALLER_NOT_CREATIVE_STUDIO
        );
        _;
    }

    /**
     * @dev Function is invoked by the proxy contract when the NFTList contract is added to the
     * AddressesProvider of the market.
     * - Caching the address of the AddressesProvider in order to reduce gas consumption
     *   on subsequent operations
     * @param provider The address of the AddressesProvider
     **/
    function initialize(address provider) external initializer {
        addressesProvider = IAddressesProvider(provider);
        emit Initialized(provider);
    }

    /**
     * @dev Register a nft address
     * - Can be called by anyone
     * @param nftAddress The address of nft contract
     * @param isERC1155 What type of nft, ERC1155 or ERC721?
     **/
    function registerNFT(address nftAddress, bool isERC1155) external {
        require(!_nftToInfo[nftAddress].isRegistered, Errors.NFT_ALREADY_REGISTERED);

        if (isERC1155) {
            require(IERC1155(nftAddress).balanceOf(address(this), 0) >= 0);
        } else {
            require(IERC721(nftAddress).balanceOf(address(this)) >= 0);
        }

        _nftToInfo[nftAddress].register(_nftsList.length, nftAddress, isERC1155);

        _nftsList.push(nftAddress);

        emit NFTRegistered(nftAddress, isERC1155);
    }

    /**
     * @dev Accept a nft address
     * - Can only be called by admin
     * @param nftAddress The address of nft contract
     **/
    function acceptNFT(address nftAddress) external onlyMarketAdmin {
        require(_nftToInfo[nftAddress].isRegistered, Errors.NFT_NOT_REGISTERED);
        require(!_nftToInfo[nftAddress].isAccepted, Errors.NFT_ALREADY_ACCEPTED);

        _nftToInfo[nftAddress].accept();
        _acceptedList.push(_nftToInfo[nftAddress].id);

        emit NFTAccepted(nftAddress);
    }

    /**
     * @dev Revoke a nft address
     * - Can only be called by admin
     * @param nftAddress The address of nft contract
     **/
    function revokeNFT(address nftAddress) external onlyMarketAdmin {
        require(_nftToInfo[nftAddress].isRegistered, Errors.NFT_NOT_REGISTERED);
        require(_nftToInfo[nftAddress].isAccepted, Errors.NFT_NOT_ACCEPTED);

        _nftToInfo[nftAddress].revoke();
        _acceptedList.removeAtValue(_nftToInfo[nftAddress].id);

        emit NFTAccepted(nftAddress);
    }

    /**
     * Check nft is ERC1155 or not?
     * @param nftAddress The address of nft
     * @return is ERC1155 or not?
     */
    function isERC1155(address nftAddress) external view returns (bool) {
        require(
            _nftToInfo[nftAddress].isRegistered == true ||
                _nftToInfo[nftAddress].isAccepted == true,
            Errors.NFT_NOT_REGISTERED
        );
        return _nftToInfo[nftAddress].isERC1155;
    }

    /**
     * @dev Register and accepts a nft address directly
     * - Can only be called by creative studio
     * @param nftAddress The address of nft contract
     * @param isERC1155 What type of nft, ERC1155 or ERC721?
     **/
    function addNFTDirectly(address nftAddress, bool isERC1155) external onlyCreativeStudio {
        _nftToInfo[nftAddress].register(_nftsList.length, nftAddress, isERC1155);
        _nftsList.push(nftAddress);
        _nftToInfo[nftAddress].accept();
        _acceptedList.push(_nftToInfo[nftAddress].id);
        emit NFTAdded(nftAddress, isERC1155);
    }

    /**
     * @dev Get the information of a nft
     * @param nftAddress The address of nft
     * @return The information of nft
     **/
    function getNFTInfor(address nftAddress) external view returns (DataTypes.NFTInfo memory) {
        return _nftToInfo[nftAddress];
    }

    /**
     * @dev Get the amount of registered nfts
     * @return The amount of registered nfts
     **/
    function getNFTCount() external view returns (uint256) {
        return _nftsList.length;
    }

    /**
     * @dev Get address of all accepted nfts
     * @return The address of all accepted nfts
     **/
    function getAcceptedNFTs() external view returns (address[] memory) {
        address[] memory result = new address[](_acceptedList.length);
        for (uint256 i = 0; i < _acceptedList.length; i++) {
            result[i] = _nftsList[_acceptedList[i]];
        }
        return result;
    }

    /**
     * @dev Check nft has been accepted or not
     * @param nftAddress The address of nft
     * @return Nft has been accepted or not?
     */
    function isAcceptedNFT(address nftAddress) external view returns (bool) {
        return _nftToInfo[nftAddress].isAccepted;
    }
}
