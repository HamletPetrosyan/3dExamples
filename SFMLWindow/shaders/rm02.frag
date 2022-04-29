uniform vec2 u_res;
uniform vec3 u_pos;
uniform vec2 u_mouse;

const int   MAX_STEPS = 100;
const int   MAX_D     = 555;
const float HIT_D     = .001;

mat2 rot(float a){
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s,
				s, c);
}

// Shapes

struct Sphere{
	vec3 color;
	vec3 position;
	float radius;
};

struct Cube {
	vec3 color;
	vec3 position;
	float radius;
};

struct Torus {
	vec3 color;
	vec3 position;
	vec2 radius;
};

struct Plane {
	vec3 color;
	vec3 normal;
	float h;
};

// Distances

float distanceSphere(vec3 from, Sphere sphere) {
	return length(from - sphere.position) - sphere.radius;
}

float distanceTorus(vec3 from, Torus torus){
	from -= torus.position;
	vec2 q = vec2(length(from.xz) - torus.radius.x, from.y);
	return length(q) - torus.radius.y;
}

float distanceCube(vec3 from, Cube cube) {
	vec3 q = abs(from - cube.position) - vec3(cube.radius);
	return length(max(q, 0)) + min(max(q.x, max(q.y, q.z)), 0);
}

float distancePlane(vec3 from, Plane plane) {
	return abs(dot(from, plane.normal) + plane.h);
}

float smin(float a, float b, float k){
	float res = exp(-k * a) + exp(-k * b);
	return -log(res) / k;
}

vec4 getDist(vec3 from){
	Sphere sphere0 = Sphere(vec3(0.1, 0.9, 0.2), vec3(-3.0, -1.5, 0.0), 1.0);
	Cube cube0 = Cube(vec3(0.2, 1.0, 0.4), vec3(-3.0, 0.0, 0.0), 1.0);
	Sphere sphere1 = Sphere(vec3(0.1, 0.9, 0.2), vec3(0.0, -1.5, 0.0), 1.0);
	Cube cube1 = Cube(vec3(0.2, 0.8, 1.0), vec3(0.0, 0.0, 0.0), 1.0);
	Sphere sphere2 = Sphere(vec3(0.1, 0.9, 0.2), vec3(3.0, 0.0, 0.0), 1.0);
	Cube cube2 = Cube(vec3(1.0, 0.8, 0.6), vec3(3.0, -1.5, 0.0), 1.0);
	Sphere sphere3 = Sphere(vec3(0.1, 0.9, 0.2), vec3(6.0, -2., 0.0), 1.0);
	Cube cube3 = Cube(vec3(1.0, 1.0, 1.0), vec3(6.0, 0.0, 0.0), 1.0);
	Plane plane1 = Plane(vec3(0.3), normalize(vec3(0.0, 0.0, 1.0)), -3.0);

	float minD = MAX_D + 5;
	float d, sdA, sdB;
	vec3 clr = vec3(0.0);
	
	d = distancePlane(from, plane1);
	if(minD > d){
		minD = d;
		clr = plane1.color;
	}

	sdA = distanceSphere(from, sphere0);
	sdB = distanceCube(from, cube0);
	if(minD > min(sdA, sdB)){
		minD = min(sdA, sdB);
		clr = cube0.color;
	}

	sdA = distanceSphere(from, sphere1);
	sdB = distanceCube(from, cube1);
	if(minD > max(-sdA, sdB)){
		minD = max(-sdA, sdB);
		clr = cube1.color;
	}

	sdA = distanceSphere(from, sphere2);
	sdB = distanceCube(from, cube2);
	if(minD > max(sdA, sdB)){
		minD = max(sdA, sdB);
		clr = cube2.color;
	}

	sdA = distanceSphere(from, sphere3);
	sdB = distanceCube(from, cube3);
	if(minD > smin(sdA, sdB, 4.5)){
		minD = smin(sdA, sdB, 4.5);
		clr = cube3.color;
	}

	return vec4(clr, minD);
}

vec3 getNormal(vec3 p){
	float d = getDist(p).a;
	vec2 e = vec2(HIT_D, 0);

	vec3 n = d - vec3(
			getDist(p - e.xyy).a,
			getDist(p - e.yxy).a,
			getDist(p - e.yyx).a);

	return normalize(n);
}

float getLight(vec3 p){
	vec3 lightPos = vec3(8.5, -7, -7);
	vec3 l = normalize(lightPos - p);
	vec3 n = getNormal(p);

	float dif = clamp(dot(n, l), 0., 1.);
	return dif;
}

vec3 rayMarch(vec3 ro, vec3 rd) {
	vec3 p = ro;
	float surfed = 0.0;

	for(int i = 0; i < MAX_STEPS; i++) {
		vec4 ret = getDist(p);
		surfed += ret.a;
		if(ret.a < HIT_D) {
			return ret.rgb * getLight(p);
		}
		if(surfed > MAX_D){
			return vec3(0.);
		}
		p += rd * ret.a;
	}
	return vec3(0.);
}

void main() {
	/// camera rotation
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_res / u_res.y;	

	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.0, uv));
	rayDirection.zx *= rot(-u_mouse.y);
	rayDirection.xy *= rot(u_mouse.x);

	/// ray marching
	vec3 color = rayMarch(rayOrigin, rayDirection);

	/// color correction
//	float white = 20.0;
//	color *= white * 16.0;
//	color = (color * (1.0 + color / white / white)) / (1.0 + color);

	/// color returning
	gl_FragColor = vec4(color, 1.0);
}
