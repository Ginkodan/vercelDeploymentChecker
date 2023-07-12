# Base image
FROM node:14-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (replace 3000 with your app's port)
EXPOSE 3088

# Start the app
CMD [ "npm", "start" ]
