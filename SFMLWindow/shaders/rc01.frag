uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_pos;
uniform float u_time;

const float MAX_DIST= 99999.0;

struct Sphere {
	vec3 color;
	vec3 position;
	float radius;
};

struct Box {
	vec3 color;
	vec3 position;
	vec3 boxSize;
};

struct Plane {
	vec3 color;
	vec4 normal;
};

mat2 rot(float a){
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s,
				s, c);
}

vec2 sphIntersect(in vec3 ro, in vec3 rd, in Sphere sphere) {
	vec3 nro = ro - sphere.position;
	float b = dot(nro, rd);
	float c = dot(nro, nro) - sphere.radius * sphere.radius;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec2 boxIntersection( in vec3 ro, in vec3 rd, in Box box, out vec3 outNormal ) 
{
    vec3 m = 1.0 / rd;
    vec3 n = m * (ro - box.position);
    vec3 k = abs(m) * box.boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if(tN > tF || tF < 0.0) return vec2(-1.0);
    outNormal = -sign(rd) * step(t1.yzx,t1.xyz) * step(t1.zxy,t1.xyz);
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

vec3 castRay(vec3 ro, vec3 rd) {
	vec3 clr;
	Sphere sphere = Sphere(vec3(1.0, 0.1, 0.2), vec3(0.0, -1.0, 0.0), 1.0);
	Box box = Box(vec3(0.4, 0.6, 0.8), vec3(0.0, 2.0, 0.0), vec3(1.0));
	Plane plane = Plane(vec3(0.5), vec4(0.0, 0.0, -1.0, 2.0));

	vec2 minIt = vec2(MAX_DIST);
	vec2 it;
	vec3 n;
	// sphere
	it = sphIntersect(ro, rd, sphere);
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		n = (ro + rd * it.x) - sphere.position;
		clr = sphere.color;
	}
	// box
	vec3 boxN;
	it = boxIntersection(ro, rd, box, boxN);
	if(it.x > 0.0 && it.x < minIt.x){
		minIt = it;
		n = boxN;
		clr = box.color;
	}
	// plane
	it = plaIntersect(ro, rd, plane);
	if(it.x > 0.0 && it.x < minIt.x){
		minIt = it;
		n = plane.normal.xyz;
		clr = plane.color;
	}
	vec3 light = normalize(vec3(-0.5, 0.75, -1.0));
	if(minIt.x == MAX_DIST) return getSky(rd, light);

	float diffuse = max(0.0, dot(light, n));
	float specular = pow(max(0.0, dot(reflect(rd, n), light)), 16.0);
	clr *= mix(diffuse, specular, 0.5);
	return clr;
}

void main() {
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_res / u_res.y;
	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.0, uv));

	rayDirection.zx *= rot(-u_mouse.y);
	rayDirection.xy *= rot(u_mouse.x);

	vec3 color = castRay(rayOrigin, rayDirection);

	color.r = pow(color.r, 0.45);
	color.g = pow(color.g, 0.45);
	color.b = pow(color.b, 0.45);
	gl_FragColor = vec4(color, 1.0);
}


