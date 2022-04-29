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
	return length(max(abs(from - cube.position) - vec3(cube.radius), 0));
}

float distancePlane(vec3 from, Plane plane) {
	return abs(dot(from, plane.normal) + plane.h);
}

vec4 getDist(vec3 from){
	Sphere sphere1 = Sphere(vec3(0.1, 0.9, 0.2), vec3(0.0, 0.0, 1.0), 1.0);
	Cube cube1 = Cube(vec3(0.2, 0.5, 0.9), vec3(0.0, 3.0, 2.0), 1.0);
	Torus torus1 = Torus(vec3(0.7, 0.2, 0.3), vec3(0.0, -3.0, 1.0), vec2(1.0, 0.5));
	Plane plane1 = Plane(vec3(0.3), normalize(vec3(0.0, 0.0, 1.0)), -3.0);

	float minD = MAX_D + 5;
	float d;
	vec3 clr = vec3(0.0);
	
	d = distancePlane(from, plane1);
	if(minD > d){
		minD = d;
		clr = plane1.color;
	}

	d = distanceCube(from, cube1);
	if(minD > d){
		minD = d;
		clr = cube1.color;
	}	

	d = distanceTorus(from, torus1);
	if(minD > d){
		minD = d;
		clr = torus1.color;
	}

	d = distanceSphere(from, sphere1);
	if(minD > d){
		minD = d;
		clr = sphere1.color;
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
