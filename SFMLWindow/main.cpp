#include <SFML/Graphics.hpp>
#include <iostream>
#include <cmath>
#include <random>
using namespace std;

#define SHADERPATH "shaders/rt03.frag"

int main(){
    using namespace sf;

    int w = 1920;
    int h = 1080;

    int mouseX = w / 2;
	int mouseY = h / 2;
    float mouseSensitivity = 3;
    bool mouseHidden = false;
    bool moving = false;

    int rot = 0;

    bool keyPRSD[8];
    fill(keyPRSD, keyPRSD + 8, false);

    Vector3f pos = sf::Vector3f(-5.0f, 0.0f, 0.0f);
    float speed = 0.1f;

    RenderWindow window(VideoMode(w, h), "Window", Style::Fullscreen);
    window.setFramerateLimit(60);
    window.setMouseCursorVisible(false);
    mouseHidden = true;

    RenderTexture firstTexture; // mr
    firstTexture.create(w, h); // mr
    Sprite firstTextureSprite = Sprite(firstTexture.getTexture()); // mr
    Sprite firstTextureSpriteFlipped = Sprite(firstTexture.getTexture()); // mr
    firstTextureSpriteFlipped.setScale(1, -1); // mr
    firstTextureSpriteFlipped.setPosition(0, h); // mr

    RenderTexture secondTexture; // mr
    secondTexture.create(w, h); // mr
    Sprite secondTextureSprite = Sprite(secondTexture.getTexture()); // mr
    Sprite secondTextureSpriteFlipped = Sprite(secondTexture.getTexture()); // mr
    secondTextureSpriteFlipped.setScale(1, -1); // mr
    secondTextureSpriteFlipped.setPosition(0, h); // mr

    int frames = 0; // mr

    Texture tex; // r
    tex.create(w, h); // r
    Sprite spr(tex); // r

    Shader shader;
    if(!shader.loadFromFile(SHADERPATH, Shader::Fragment)){
        cerr << "Error while loading shaders" << endl;
        return -1;
    }
    shader.setUniform("u_res", Vector2f(w, h));

    random_device rd;
	mt19937 e2(rd());
	uniform_real_distribution<> dist(0.0f, 1.0f);

    while(window.isOpen()){
        Event event;
        while(window.pollEvent(event)){
            if(event.type == Event::Closed) window.close();
            else if(event.type == Event::KeyPressed){
                if(event.key.code == Keyboard::Escape){
                    window.setMouseCursorVisible(true);
                    mouseHidden = false;
                }
                else if (event.key.code == sf::Keyboard::W) keyPRSD[0] = true;
				else if (event.key.code == sf::Keyboard::A) keyPRSD[1] = true;
				else if (event.key.code == sf::Keyboard::S) keyPRSD[2] = true;
				else if (event.key.code == sf::Keyboard::D) keyPRSD[3] = true;
				else if (event.key.code == sf::Keyboard::Space) keyPRSD[4] = true;
				else if (event.key.code == sf::Keyboard::LShift) keyPRSD[5] = true;
				else if (event.key.code == sf::Keyboard::K) keyPRSD[6] = true;
				else if (event.key.code == sf::Keyboard::L) keyPRSD[7] = true;
            }
            else if (event.type == sf::Event::KeyReleased){
				if (event.key.code == sf::Keyboard::W) keyPRSD[0] = false;
				else if (event.key.code == sf::Keyboard::A) keyPRSD[1] = false;
				else if (event.key.code == sf::Keyboard::S) keyPRSD[2] = false;
				else if (event.key.code == sf::Keyboard::D) keyPRSD[3] = false;
				else if (event.key.code == sf::Keyboard::Space) keyPRSD[4] = false;
				else if (event.key.code == sf::Keyboard::LShift) keyPRSD[5] = false;
				else if (event.key.code == sf::Keyboard::K) keyPRSD[6] = false;
				else if (event.key.code == sf::Keyboard::L) keyPRSD[7] = false;
			}
            else if (event.type == sf::Event::MouseMoved){
				if (mouseHidden){
                    int mx = event.mouseMove.x - w / 2;
                    int my = event.mouseMove.y - h / 2;
					mouseX += mx;
					mouseY += my;
					sf::Mouse::setPosition(sf::Vector2i(w / 2, h / 2), window);
                    if(mx != 0 || my != 0) frames = 1; // mr
				}
			}
			else if (event.type == sf::Event::MouseButtonPressed){
				window.setMouseCursorVisible(false);
				mouseHidden = true;
			}
        }
        if (mouseHidden)
		{
			float mx = ((float)mouseX / w - 0.5f) * mouseSensitivity;
			float my = ((float)mouseY / h - 0.5f) * mouseSensitivity;
			Vector3f dir = sf::Vector3f(0.0f, 0.0f, 0.0f);
			Vector3f dirTemp;
			if (keyPRSD[0]) dir = Vector3f(1.0f, 0.0f, 0.0f);
			else if (keyPRSD[2]) dir = Vector3f(-1.0f, 0.0f, 0.0f);
			if (keyPRSD[1]) dir += Vector3f(0.0f, -1.0f, 0.0f);
			else if (keyPRSD[3]) dir += Vector3f(0.0f, 1.0f, 0.0f);
			dirTemp.z = dir.z * cos(-my) - dir.x * sin(-my);
			dirTemp.x = dir.z * sin(-my) + dir.x * cos(-my);
			dirTemp.y = dir.y;
			dir.x = dirTemp.x * cos(mx) - dirTemp.y * sin(mx);
			dir.y = dirTemp.x * sin(mx) + dirTemp.y * cos(mx);
			dir.z = dirTemp.z;
			pos += dir * speed;
			if (keyPRSD[4]) pos.z -= speed;
			else if (keyPRSD[5]) pos.z += speed;
			if (keyPRSD[6]) rot++;
			if (keyPRSD[7]) rot--;
			for(int i = 0; i < 8; i++){ // mr
                if(keyPRSD[i]){         // mr
                    frames = 1;         // mr
                    moving = true;      // mr
                    break;              // mr
                }                       // mr
			}                           // mr
			shader.setUniform("u_pos", pos);
			shader.setUniform("u_mouse", Vector2f(mx, my));
			shader.setUniform("u_mve", moving); moving = false; // mr
			shader.setUniform("u_rtzx", rot);
			shader.setUniform("u_frame_part", 1.0f / frames);
			shader.setUniform("u_seed1", Vector2f((float)dist(e2), (float)dist(e2)) * 999.0f); // r
			shader.setUniform("u_seed2", Vector2f((float)dist(e2), (float)dist(e2)) * 999.0f); // r
            if(frames % 2 == 1){
                shader.setUniform("u_prevframe", firstTexture.getTexture());
                secondTexture.draw(firstTextureSpriteFlipped, &shader);
                window.draw(secondTextureSprite);
            }
            else {
                shader.setUniform("u_prevframe", secondTexture.getTexture());
                firstTexture.draw(secondTextureSpriteFlipped, &shader);
                window.draw(firstTextureSprite);
            }
		}
		window.display();
		frames++;
    }

    return 0;
}
