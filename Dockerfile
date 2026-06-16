FROM python:3.12-slim

# 设置环境变量，确保 /usr/local/bin 在 PATH 中
ENV PATH="/usr/local/bin:${PATH}"

WORKDIR /app

# 安装 everos
RUN pip install --no-cache-dir everos

# 暴露默认端口
EXPOSE 8000

# 启动命令：如果 .env 不存在则自动生成
CMD ["sh", "-c", "if [ ! -f .env ]; then everos init; fi; everos server start"]
