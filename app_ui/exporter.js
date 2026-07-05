document.getElementById('exportBuildBtn').addEventListener('click', async () => {
    const canvas = document.getElementById('paintCanvas');
    const themeDropdown = document.getElementById('themeSelect');
    const skinSelector = document.getElementById('characterSkinSelect');
    const lightSlider = document.getElementById('ambientLightSlider');
    const mapBase64Data = canvas.toDataURL('image/png').split(',');

    const activeThemeKey = themeDropdown.value;
    const activeSkinKey = skinSelector.value;
    const currentAudioUrl = THEME_AUDIO_MAP[activeThemeKey] || THEME_AUDIO_MAP["custom"];
    let skinUrl = CHARACTER_SKIN_MAP[activeSkinKey];
    
    const numericLightPercentage = lightSlider.value / 100;
    const hexVal = Math.floor(numericLightPercentage * 255).toString(16).padStart(2, '0');
    let colorTintHex = `0x${hexVal}${hexVal}${hexVal}`;

    let weatherType = "none";
    if (activeThemeKey === "rainy_neon_alley" || activeThemeKey === "cyberpunk_market") weatherType = "rain";
    else if (activeThemeKey === "alpine_snowy_lodge") weatherType = "snow";
    else if (activeThemeKey === "volcanic_wasteland") weatherType = "ash";

    // ─── SEMANTIC MATRIX MATRIX SCANNING PASS ────────────────────────────────
    const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = canvasData.data;
    
    const wallGrid = [];
    const enemyGrid = [];
    const interactGrid = [];

    for (int y = 0; y < canvas.height; y += 16) {
        for (int x = 0; x < canvas.width; x += 16) {
            const idx = (y * canvas.width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];

            // 1. Extract Pure Black (#000000) -> Solid Wall Data
            if (r === 0 && g === 0 && b === 0) {
                wallGrid.push({ x: x + 8, y: y + 8 });
            }
            // 2. Extract Pure Red (#FF0000) -> Patrol Enemy Spawn Points
            else if (r === 255 && g === 0 && b === 0) {
                enemyGrid.push({ x: x + 8, y: y + 8 });
            }
            // 3. Extract Pure Orange (#FF9900) -> Interactable Object Contexts
            else if (r === 255 && g === 153 && b === 0) {
                interactGrid.push({ x: x + 8, y: y + 8 });
            }
        }
    }

    const zip = new JSZip();
    zip.file("assets/map.png", mapData, {base64: true});

    if (activeSkinKey === "custom_upload" && customUploadedSpriteBase64) {
        zip.file("assets/character.png", customUploadedSpriteBase64.split(','), {base64: true});
        skinUrl = 'assets/character.png';
    }

    // ─── ADVANCED STANDALONE ENGINE GAMEBUILD LAYOUT ─────────────────────────
    const gameIndexTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Standalone Level Build</title>
        <script src="https://jsdelivr.net"><\/script>
        <style>body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }</style>
    </head>
    <body>
    <script>
        const config = {
            type: Phaser.AUTO, width: 512, height: 512,
            physics: { default: 'arcade' },
            scene: { preload: preload, create: create, update: update }
        };
        const game = new Phaser.Game(config);
        
        let player, keys, actionKey, walls, enemies, interactables;
        let weatherParticles = [];
        let uiTextNotice;
        
        const weatherProfile = "${weatherType}";
        const globalTintValue = ${colorTintHex};
        
        // Inject compiled coordinates from drawing canvas
        const wallData = ${JSON.stringify(wallGrid)};
        const enemyData = ${JSON.stringify(enemyGrid)};
        const interactData = ${JSON.stringify(interactGrid)};

        function preload() {
            this.load.image('map', 'assets/map.png');
            this.load.audio('bgm', '${currentAudioUrl}');
            this.load.spritesheet('hero', '${skinUrl}', { frameWidth: 32, frameHeight: 48 });
            this.load.spritesheet('slime', 'https://phaser.io', { frameWidth: 32, frameHeight: 32 });
        }

        function create() {
            let mapSprite = this.add.image(256, 256, 'map');
            mapSprite.setTint(globalTintValue);
            
            try { this.sound.add('bgm').play({ loop: true, volume: 0.3 }); } catch(e) {}

            // 1. SOLID WALL GEOMETRY SETUP
            walls = this.physics.add.staticGroup();
            for (let c of wallData) {
                walls.add(this.add.zone(c.x, c.y, 16, 16));
            }

            // 2. INTERACTABLE OBJECT TRIGGER FIELDS SETUP
            interactables = this.physics.add.staticGroup();
            for (let c of interactData) {
                // Generate a visual anchor point zone for interactions
                let zone = this.add.zone(c.x, c.y, 24, 24);
                interactables.add(zone);
            }

            // 3. PATROLLING ENEMY MANAGEMENT PRESET
            enemies = this.physics.add.group();
            for (let c of enemyData) {
                let mob = enemies.create(c.x, c.y, 'slime');
                mob.setTint(globalTintValue);
                mob.setCollideWorldBounds(true);
                
                // Add velocity to initiate side-to-side patrol physics loops
                mob.setVelocityX(60);
                mob.startX = c.x;
                mob.patrolRange = 48; // Patrols back and forth across 3 grid blocks
            }

            // 4. MAIN CHARACTER CONTROLLERS AND HITBOX TUNING
            player = this.physics.add.sprite(256, 256, 'hero');
            player.setTint(globalTintValue);
            player.setCollideWorldBounds(true);
            player.body.setSize(20, 24, true).setOffset(6, 24);

            // 5. COLLISION MATRIX LISTENERS
            this.physics.add.collider(player, walls);
            this.physics.add.collider(enemies, walls); // Enemies bump off wall blocks
            
            // Player gets pushed back if touched by an active patrol enemy monster
            this.physics.add.overlap(player, enemies, (p, enemy) => {
                p.body.velocity.x *= -1.5;
                p.body.velocity.y *= -1.5;
                p.setTint(0xff0000); // Flash crimson on damage interaction
                this.time.delayedCall(200, () => p.setTint(globalTintValue));
            });

            // 6. UI HUD SETUP
            uiTextNotice = this.add.text(256, 460, '', { fontSize: '12px', fill: '#ffffff', backgroundColor: '#111115', padding: 6 }).setOrigin(0.5).setAlpha(0);

            keys = this.input.keyboard.createCursorKeys();
            actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Register E Key binding

            // Weather Generators
            if (weatherProfile !== "none") {
                let count = weatherProfile === "rain" ? 150 : 60;
                for (let i = 0; i < count; i++) {
                    weatherParticles.push({
                        x: Math.random() * 512, y: Math.random() * 512,
                        vY: weatherProfile === "rain" ? 12 : 1.5, vX: weatherProfile === "snow" ? (Math.random() - 0.5) * 0.8 : -0.5,
                        length: weatherProfile === "rain" ? 14 : 2, color: weatherProfile === "rain" ? 0x99b3ff : weatherProfile === "ash" ? 0xff4500 : 0xffffff,
                        graphics: this.add.graphics()
                    });
                }
            }
        }

        function update() {
            player.setVelocity(0);
            if (keys.left.isDown) player.setVelocityX(-160);
            else if (keys.right.isDown) player.setVelocityX(160);
            if (keys.up.isDown) player.setVelocityY(-160);
            else if (keys.down.isDown) player.setVelocityY(160);

            // ─── PATROL MOTOR LOGIC PASS ────────────────────────────────────
            enemies.children.iterate((mob) => {
                if (!mob) return;
                if (Math.abs(mob.x - mob.startX) >= mob.patrolRange) {
                    mob.setVelocityX(mob.body.velocity.x * -1); // Reverse structural orientation vectors
                    mob.startX = mob.x; // Re-anchor boundary calculations
                }
            });

            // ─── OBJECT INTERACTION MECHANIC ─────────────────────────────────
            uiTextNotice.setAlpha(0); // Hide notice indicator by default
            
            // Check if player cursor overlaps with any interactable orange positions
            this.physics.overlap(player, interactables, (p, zone) => {
                uiTextNotice.setText("[E] LOOK AT INTERESTING OBJECT");
                uiTextNotice.setAlpha(1);

                if (Phaser.Input.Keyboard.JustDown(actionKey)) {
                    uiTextNotice.setText("✨ You found a detailed Chef RPG store asset chest!");
                    // Play a quick sound pulse or trigger dialogue loops here
                }
            });

            // Weather Engine calculations
            for (let p of weatherParticles) {
                p.graphics.clear(); p.y += p.vY; p.x += p.vX; if (p.y > 512) { p.y = -10; p.x = Math.random() * 512; }
                p.graphics.lineStyle(1.5, p.color, 0.6);
                if (weatherProfile === "rain") p.graphics.lineBetween(p.x, p.y, p.x + p.vX, p.y + p.length);
                else { p.graphics.fillStyle(p.color, 0.7); p.graphics.fillCircle(p.x, p.y, p.length); }
            }
        }
    <\/script>
    </body>
    </html>`;

    zip.file("index.html", gameIndexTemplate);
    const compiledArchive = await zip.generateAsync({type: "blob"});
    const dlAnchor = document.createElement('a');
    dlAnchor.href = URL.createObjectURL(compiledArchive);
    dlAnchor.download = `CustomLevel_Complete_${activeThemeKey}.zip`;
    dlAnchor.click();
});