FROM node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=8080
ENV FINDAT_DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "server.js"]
