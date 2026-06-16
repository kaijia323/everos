FROM python:3.12-slim

# 设置时区为上海
ENV TZ=Asia/Shanghai
RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 everos
RUN pip install --no-cache-dir everos

# 暴露默认端口
EXPOSE 8000

# 启动命令：如果 .env 不存在则自动生成
CMD ["sh", "-c", "if [ ! -f .env ]; then everos init; fi; everos server start"]
