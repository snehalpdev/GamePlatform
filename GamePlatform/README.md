Step-by-Step Instructions to Build and Run the AppBefore launching, make sure you have the NVIDIA Container Toolkit installed on your computer if you are using an NVIDIA graphics card. This toolkit allows Docker containers to tap into your GPU hardware.

Launch the Container Stack: Open your command prompt or terminal window inside your root project folder and execute this command:
docker compose up --build -d
(The --build flag compiles your custom code variations, and -d runs the servers in detached mode in the background so your terminal remains free).

Access Your Application Platform: Open your web browser and navigate to exactly:
http://localhost:8000

Shutting Down the Services: When you are done designing your levels and want to shut down the background servers safely, execute:
docker compose down