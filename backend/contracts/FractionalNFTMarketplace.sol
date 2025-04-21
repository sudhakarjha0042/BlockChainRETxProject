// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FractionalNFTMarketplace is ERC721Enumerable, Ownable, ReentrancyGuard {
    enum VerificationStatus { Pending, Verified, Rejected }

    struct Property {
        uint256 tokenId;
        address owner;
        string name;
        string propertyAddress;
        string imageUrl;
        string documentUrl;
        uint256 totalFractions;
        uint256 pricePerFraction;
        uint256 availableFractions;
        VerificationStatus status;
    }

    uint256 public nextTokenId = 1;
    mapping(uint256 => Property) public properties;
    address public verifier;
    uint256 public verificationFee;

    event PropertySubmitted(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        string propertyAddress,
        string imageUrl,
        string documentUrl,
        uint256 totalFractions,
        uint256 pricePerFraction
    );
    event PropertyVerified(uint256 indexed tokenId);
    event PropertyRejected(uint256 indexed tokenId);
    event FractionBought(uint256 indexed tokenId, address indexed buyer, uint256 fractions, uint256 totalCost);
    event FractionSold(uint256 indexed tokenId, address indexed seller, uint256 fractions, uint256 amountReceived);
    event VerifierUpdated(address indexed newVerifier);
    event VerificationFeeUpdated(uint256 newFee);

    constructor(uint256 _initialVerificationFee) ERC721("FractionalNFT", "fNFT") Ownable(msg.sender) {
        verifier = msg.sender;
        verificationFee = _initialVerificationFee;
        emit VerifierUpdated(msg.sender);
        emit VerificationFeeUpdated(_initialVerificationFee);
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Marketplace: Caller is not the verifier");
        _;
    }

    function setVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Marketplace: New verifier cannot be the zero address");
        verifier = _newVerifier;
        emit VerifierUpdated(_newVerifier);
    }

    function setVerificationFee(uint256 _newFee) external onlyOwner {
        verificationFee = _newFee;
        emit VerificationFeeUpdated(_newFee);
    }

    function submitPropertyForVerification(
        string memory _name,
        string memory _propertyAddress,
        string memory _imageUrl,
        string memory _documentUrl,
        uint256 _totalFractions,
        uint256 _pricePerFraction
    ) external payable nonReentrant {
        require(msg.value == verificationFee, "Marketplace: Incorrect verification fee sent");
        require(_totalFractions > 0, "Marketplace: Total fractions must be positive");
        require(_pricePerFraction > 0, "Marketplace: Price per fraction must be positive");
        require(bytes(_name).length > 0, "Marketplace: Name cannot be empty");
        require(bytes(_propertyAddress).length > 0, "Marketplace: Address cannot be empty");
        require(bytes(_imageUrl).length > 0, "Marketplace: Image URL cannot be empty");
        require(bytes(_documentUrl).length > 0, "Marketplace: Document URL cannot be empty");

        uint256 tokenId = nextTokenId++;
        properties[tokenId] = Property({
            tokenId: tokenId,
            owner: msg.sender,
            name: _name,
            propertyAddress: _propertyAddress,
            imageUrl: _imageUrl,
            documentUrl: _documentUrl,
            totalFractions: _totalFractions,
            pricePerFraction: _pricePerFraction,
            availableFractions: _totalFractions,
            status: VerificationStatus.Pending
        });

        emit PropertySubmitted(
            tokenId,
            msg.sender,
            _name,
            _propertyAddress,
            _imageUrl,
            _documentUrl,
            _totalFractions,
            _pricePerFraction
        );
    }

    function verifyProperty(uint256 _tokenId, bool _approve) external onlyVerifier nonReentrant {
        Property storage property = properties[_tokenId];
        require(property.status == VerificationStatus.Pending, "Marketplace: Property not pending verification");
        require(bytes(property.name).length > 0, "Marketplace: Property does not exist");

        if (_approve) {
            property.status = VerificationStatus.Verified;
            _mint(property.owner, _tokenId);
            (bool success, ) = payable(verifier).call{value: verificationFee}("");
            require(success, "Marketplace: Fee transfer failed");
            emit PropertyVerified(_tokenId);
        } else {
            property.status = VerificationStatus.Rejected;
            (bool success, ) = payable(property.owner).call{value: verificationFee}("");
            require(success, "Marketplace: Fee refund failed");
            emit PropertyRejected(_tokenId);
        }
    }

    function buyFraction(uint256 _tokenId, uint256 _fractions) external payable nonReentrant {
        Property storage property = properties[_tokenId];
        require(bytes(property.name).length > 0, "Marketplace: Property does not exist");
        require(property.status == VerificationStatus.Verified, "Marketplace: Property not verified");
        require(_fractions > 0, "Marketplace: Fractions must be greater than zero");
        require(_fractions <= property.availableFractions, "Marketplace: Not enough fractions listed for sale");

        uint256 totalCost = _fractions * property.pricePerFraction;
        require(msg.value == totalCost, "Marketplace: Incorrect Ether sent");

        address currentOwner = ownerOf(_tokenId);
        payable(currentOwner).transfer(totalCost);

        property.availableFractions -= _fractions;

        emit FractionBought(_tokenId, msg.sender, _fractions, totalCost);
    }

    function getAllListings() external view returns (Property[] memory) {
        uint256 verifiedCount = 0;
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (bytes(properties[i].name).length > 0 && properties[i].status == VerificationStatus.Verified) {
                verifiedCount++;
            }
        }

        Property[] memory activeListings = new Property[](verifiedCount);
        uint256 count = 0;
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (bytes(properties[i].name).length > 0 && properties[i].status == VerificationStatus.Verified) {
                activeListings[count] = properties[i];
                count++;
            }
        }

        return activeListings;
    }

    function getPropertyDetails(uint256 _tokenId) external view returns (Property memory) {
        require(bytes(properties[_tokenId].name).length > 0, "Marketplace: Property does not exist");
        return properties[_tokenId];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
