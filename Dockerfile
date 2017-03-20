
FROM node:6

RUN mkdir -p /opt/handel-worker

# Install node_modules to app dir parents to avoid layer overright on run
WORKDIR /opt/handel-worker
ADD . /opt/handel-worker

RUN npm install

EXPOSE 5000

CMD ["node", "handel-worker.js"]