#version 130

uniform vec2 u_res;
uniform vec3 u_pos;
uniform vec2 u_mouse;
uniform vec2 u_seed1;
uniform vec2 u_seed2;
uniform float u_frame_part;
uniform sampler2D u_prevframe;
uniform bool u_mve;
uniform int u_rtzx;

const int RAY_COUNT = 64;
const float MAX_DIST= 100.0;
const int MAX_DEPTH = 64;

int index = 0;

mat2 rot(float a){
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s,
				s, c);
}

// Random

uvec4 R_STATE;

uint TausStep(uint z, int S1, int S2, int S3, uint M)
{
	uint b = (((z << S1) ^ z) >> S2);
	return (((z & M) << S3) ^ b);	
}

uint LCGStep(uint z, uint A, uint C)
{
	return (A * z + C);	
}

vec2 hash22(vec2 p)
{
	p += u_seed1.x;
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xx+p3.yz)*p3.zy);
}

float random()
{
	R_STATE.x = TausStep(R_STATE.x, 13, 19, 12, uint(4294967294));
	R_STATE.y = TausStep(R_STATE.y, 2, 25, 4, uint(4294967288));
	R_STATE.z = TausStep(R_STATE.z, 3, 11, 17, uint(4294967280));
	R_STATE.w = LCGStep(R_STATE.w, uint(1664525), uint(1013904223));
	return 2.3283064365387e-10 * float((R_STATE.x ^ R_STATE.y ^ R_STATE.z ^ R_STATE.w));
}

vec3 randomOnSphere() {
	vec3 rand = vec3(random(), random(), random());
	float theta = rand.x * 2.0 * 3.14159265;
	float v = rand.y;
	float phi = acos(2.0 * v - 1.0);
	float r = pow(rand.z, 1.0 / 3.0);
	float x = r * sin(phi) * cos(theta);
	float y = r * sin(phi) * sin(theta);
	float z = r * cos(phi);
	return vec3(x, y, z);
}


// Material

struct Material {
	vec3 color;
	bool light;
	float roughness;
};

struct Sphere {
	Material m;
	vec3 position;
	float radius;
};

struct Box {
	Material m;
	vec3 position;
	vec3 boxSize;
};

struct Plane {
	Material m;
	vec4 normal;
};

vec2 sphIntersection(in vec3 ro, in vec3 rd, in Sphere sphere) {
	vec3 nro = ro - sphere.position;
	float b = dot(nro, rd);
	float c = dot(nro, nro) - sphere.radius * sphere.radius;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec2 boxIntersection( in vec3 ro, in vec3 rd, in Box box, out vec3 outNormal, float rxy = 0., float rzx = 0.) 
{
	vec3 nrd = rd; nrd.xy *= rot(rxy); 
	vec3 nro = (ro - box.position); nro.xy *= rot(rxy);
	vec3 m = 1.0 / nrd;
    vec3 n = m * nro;
    vec3 k = abs(m) * box.boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if(tN > tF || tF < 0.0) return vec2(-1.0);
    outNormal = -sign(nrd) * step(t1.yzx,t1.xyz) * step(t1.zxy,t1.xyz);
    return vec2(tN, tF);
}

float plaIntersect(in vec3 ro, in vec3 rd, in Plane plane)
{
    return -(dot(ro, plane.normal.xyz) + plane.normal.w) / dot(rd, plane.normal.xyz);
}

vec3 getSky(vec3 rd, vec3 light) {
	vec3 clr = vec3(0.3, 0.6, 1.0);
	vec3 sunclr = vec3(0.95, 0.9, 1.0);
	sunclr *= pow(max(0.0, dot(rd, light)), 16.0);
	return clamp(sunclr + clr, 0.0, 1.0);
}

bool rayCast(inout vec3 ro, inout vec3 rd, inout vec3 color) {
	Material m;
	Box bottom = Box(Material(vec3(1.0, 1.0, 1.0), false, 1.0), vec3(0.0, 0.0, 1.5), vec3(5.0, 5.0, 0.5));
	Box top    = Box(Material(vec3(0.0, 0.0, 0.0), false, 1.0), vec3(0.0, 0.0, -8.5), vec3(5.0, 5.0, 0.5));
	Box left   = Box(Material(vec3(1.0, 0.0, 0.0), false, 1.0), vec3(0.0, -5.5, -3.5), vec3(5.0, 0.5, 5.5));
	Box back   = Box(Material(vec3(0.0, 1.0, 0.0), false, 1.0), vec3(5.5, 0.0, -3.5), vec3(0.5, 6.0, 5.5));
	Box right  = Box(Material(vec3(0.0, 0.0, 1.0), false, 1.0), vec3(0.0, 5.5, -3.5), vec3(5.0, 0.5, 5.5));
	Box ltbox  = Box(Material(vec3(1.0, 1.0, 1.0), true, 1.0), vec3(0.0, 0.0, -7.95), vec3(5.0, 5.0, 0.05));
	//Plane plane = Plane(Material(vec3(0.5), false, 1.0), vec4(0.0, 0.0, -1.0, 2.0));
	
	Box box1 = Box(Material(vec3(0.78, 0.24, 0.96), false, 0.74), vec3(2.0, -2.0, 0.0), vec3(1.0, 1.0, 1.0));
	Box box2 = Box(Material(vec3(0.2, 0.7, 1.0), false, 0.21), vec3(-1.1, 0.0, 0.6), vec3(0.4));
	Sphere sphere1 = Sphere(Material(vec3(1.0, 0.3, 0.1), false, 0.08), vec3(1.0, 2.3, -1.0), 2.0);
	Sphere sphere2 = Sphere(Material(vec3(0.35, 0.93, 0.65), false, 0.44), vec3(2.0, -2.0, -1.5), 0.5);

	vec2 minIt = vec2(MAX_DIST);
	vec2 it;
	vec3 n, _n, nro;
	
	it = boxIntersection(ro, rd, bottom, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = bottom.m;
	}
	
	it = boxIntersection(ro, rd, top, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = top.m;
	}
	
	it = boxIntersection(ro, rd, left, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = left.m;
	}

	it = boxIntersection(ro, rd, right, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = right.m;
	}
	
	it = boxIntersection(ro, rd, back, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = back.m;
	}

	it = boxIntersection(ro, rd, ltbox, _n);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = ltbox.m;
	}

//	it = vec2(plaIntersect(ro, rd, plane));
//	if(it.x > 0.001 && it.x < minIt.x){
//		minIt = it;
//		n = plane.normal.xyz;
//		m = plane.m;
//	}

	// shapes in box
	it = boxIntersection(ro, rd, box1, _n, 0.4);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = box1.m;
	}

	it = boxIntersection(ro, rd, box2, _n, 0.62);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = _n;
		m = box2.m;
	}

	it = sphIntersection(ro, rd, sphere2);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = normalize((ro + rd * it.x) - sphere2.position);
		m = sphere2.m;
	}

	it = sphIntersection(ro, rd, sphere1);
	if(it.x > 0.001 && it.x < minIt.x){
		minIt = it;
		n = normalize((ro + rd * it.x) - sphere1.position);
		m = sphere1.m;
	}	



	vec3 light = normalize(vec3(-0.5, 0.75, -1.0));
	if(minIt.x == MAX_DIST) {
		color *= vec3(0.);
		return true;
	}

	if(m.light){
		color *= m.color;
		return true;
	}

	vec3 spec = reflect(rd, n);
	vec3 diff = normalize(dot(n, randomOnSphere()) * randomOnSphere());

	color *= m.color;
	ro += rd * (minIt.x - 0.00001);
	rd = mix(spec, diff, m.roughness);
	return false;
}

// Ray Tracing

vec3 rayTrace(vec3 ro, vec3 rd) {
	vec3 color = vec3(1.0);
	for(int i = 0; i <= MAX_DEPTH; i++){
		if(rayCast(ro, rd, color)){
			return color;
		}
	}
	return color;
}

// Main

void main() {
	/// camera rotation
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_res / u_res.y;
	
	vec2 uvRes = hash22(uv + 1.0) * u_res + u_res;
	R_STATE.x = uint(u_seed1.x + uvRes.x);
	R_STATE.y = uint(u_seed1.y + uvRes.x);
	R_STATE.z = uint(u_seed2.x + uvRes.y);
	R_STATE.w = uint(u_seed2.y + uvRes.y);

	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.5, uv));
	rayDirection.zx *= rot(float(u_rtzx) * -0.1);

	/// tracing

	vec3 color = vec3(0.);
	if(u_mve){
		color = rayTrace(rayOrigin, rayDirection);		
	}
	else{
		for(int i = 0; i < RAY_COUNT; i++){
			color += rayTrace(rayOrigin, rayDirection);
		}
		color /= float(RAY_COUNT);
	}

	/// color correction
	color.r = pow(color.r, 0.45);
	color.g = pow(color.g, 0.45);
	color.b = pow(color.b, 0.45);

	/// average frame
	vec3 frameColor = texture(u_prevframe, gl_TexCoord[0].xy).rgb;
	color = mix(frameColor, color, u_frame_part);

	/// color returning
	gl_FragColor = vec4(color, 1.0);
}

