FROM node:16-alpine

ARG SOURCE_VERSION=na
ENV SOURCE_VERSION=$SOURCE_VERSION

RUN apk add --update bash && rm -rf /var/cache/apk/*

WORKDIR /app
ADD . .

RUN npm install
EXPOSE 3200

CMD ["npm", "start"]
