# Use a highly optimized, lightweight Nginx web server image
FROM nginx:alpine

# Remove default server configurations to prevent file template collisions
RUN rm -rf /usr/share/nginx/html/*

# Copy all front-end UI visual asset assets straight into the web server directory
COPY . /usr/share/nginx/html

# Expose the standard communication port for web access
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
