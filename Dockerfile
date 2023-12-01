FROM node:21.2-alpine3.18

WORKDIR /app
COPY . /app

RUN apk add --update npm && \
    rm -rf /var/cache/apk/* && \
    npm install

EXPOSE 3000
CMD ["node", "/app/app.js"]