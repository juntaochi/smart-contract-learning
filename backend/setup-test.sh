#!/bin/bash

echo "🧪 ERC20 Transfer Indexer Testing Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Anvil is running
echo -e "${BLUE}Step 1: Checking if Anvil is running...${NC}"
if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Anvil is not running. Starting Anvil...${NC}"
    echo "Please run: anvil"
    echo "Then run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Anvil is running${NC}"
echo ""

# Deploy ERC20 token and create test transfers
echo -e "${BLUE}Step 2: Deploying ERC20 token and creating test transfers...${NC}"
cd "$(dirname "$0")/.."
forge script script/DeployAndTestMyToken.s.sol:DeployAndTestMyToken \
    --rpc-url http://127.0.0.1:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Deployment failed${NC}"
    exit 1
fi
echo ""

# Extract token address from output
TOKEN_ADDRESS=$(forge script script/DeployAndTestMyToken.s.sol:DeployAndTestMyToken --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 2>/dev/null | grep "Token Address:" | awk '{print $3}')

if [ -z "$TOKEN_ADDRESS" ]; then
    echo -e "${YELLOW}⚠️  Could not extract token address. Please manually update backend/.env${NC}"
else
    echo -e "${GREEN}✓ Token deployed at: $TOKEN_ADDRESS${NC}"
    
    # Update .env file
    echo -e "${BLUE}Step 3: Updating backend/.env file...${NC}"
    if [ -f "backend/.env" ]; then
        # Check if TOKEN_ADDRESSES exists in .env
        if grep -q "TOKEN_ADDRESSES=" backend/.env; then
            # Update existing TOKEN_ADDRESSES
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|TOKEN_ADDRESSES=.*|TOKEN_ADDRESSES=\"$TOKEN_ADDRESS\"|" backend/.env
            else
                # Linux
                sed -i "s|TOKEN_ADDRESSES=.*|TOKEN_ADDRESSES=\"$TOKEN_ADDRESS\"|" backend/.env
            fi
            echo -e "${GREEN}✓ Updated TOKEN_ADDRESSES in backend/.env${NC}"
        else
            # Add TOKEN_ADDRESSES
            echo "TOKEN_ADDRESSES=\"$TOKEN_ADDRESS\"" >> backend/.env
            echo -e "${GREEN}✓ Added TOKEN_ADDRESSES to backend/.env${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    fi
fi
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Make sure PostgreSQL is running"
echo "2. Run: cd backend && npm run prisma:migrate"
echo "3. Start the indexer: npm run dev"
echo "4. Test the API: curl http://localhost:3000/api/transfers/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
echo ""
