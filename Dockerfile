FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production


# Bundle app source
COPY . .

# build with webpack
ARG ENV=development
ENV ENV=${ENV}
RUN npx webpack build --config ./webpack.config.js --mode ${ENV} --env ENV=${ENV}


EXPOSE 3000
CMD [ "node", "server/server.js" ]