#!/bin/bash

echo "🐘 PostgreSQL 安装和配置检查"
echo "================================"
echo ""

# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew 未安装"
    echo "请先安装 Homebrew:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
fi
echo "✅ Homebrew 已安装"

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 未安装"
    echo ""
    read -p "是否现在安装 PostgreSQL? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 正在安装 PostgreSQL..."
        brew install postgresql@15
        echo "✅ PostgreSQL 安装完成"
    else
        echo "请手动运行: brew install postgresql@15"
        exit 1
    fi
else
    echo "✅ PostgreSQL 已安装: $(psql --version)"
fi

# 检查 PostgreSQL 服务是否运行
if pg_isready &> /dev/null; then
    echo "✅ PostgreSQL 服务正在运行"
else
    echo "⚠️  PostgreSQL 服务未运行"
    echo ""
    read -p "是否启动 PostgreSQL 服务? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 正在启动 PostgreSQL..."
        brew services start postgresql@15
        sleep 2
        if pg_isready &> /dev/null; then
            echo "✅ PostgreSQL 服务启动成功"
        else
            echo "❌ PostgreSQL 服务启动失败"
            exit 1
        fi
    else
        echo "请手动运行: brew services start postgresql@15"
        exit 1
    fi
fi

# 创建数据库
DB_NAME="erc20_indexer"
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ 数据库 '$DB_NAME' 已存在"
else
    echo "📊 创建数据库 '$DB_NAME'..."
    createdb $DB_NAME
    if [ $? -eq 0 ]; then
        echo "✅ 数据库创建成功"
    else
        echo "❌ 数据库创建失败"
        exit 1
    fi
fi

# 获取当前用户名
USERNAME=$(whoami)
DATABASE_URL="postgresql://$USERNAME@localhost:5432/$DB_NAME?schema=public"

echo ""
echo "🎉 PostgreSQL 配置完成！"
echo ""
echo "数据库信息："
echo "  名称: $DB_NAME"
echo "  用户: $USERNAME"
echo "  连接URL: $DATABASE_URL"
echo ""
echo "请将以下内容添加到 backend/.env:"
echo "DATABASE_URL=\"$DATABASE_URL\""
echo ""

# 更新 .env 文件
if [ -f ".env" ]; then
    if grep -q "DATABASE_URL=" .env; then
        echo "⚠️  .env 文件中已存在 DATABASE_URL"
        read -p "是否更新? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
            else
                sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
            fi
            echo "✅ .env 文件已更新"
        fi
    else
        echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
        echo "✅ DATABASE_URL 已添加到 .env"
    fi
fi

echo ""
echo "下一步："
echo "1. cd backend"
echo "2. npm run prisma:migrate"
echo "3. npm run dev"
