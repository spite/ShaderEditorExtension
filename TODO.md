
inside Code

- multi-wrapper of hook: glError, glLog/Trace/glAsync/replay.
- store framebuffer ID per program, glreadspixel of program framebuffer when user Picks
- better "multi canvas" (context with per canvas)
- preferences: vertex shader/off
- session: save shader selected, cursor position, shader view (vs collapsed or not)
- shader edit history on reload

Next features

- debug other value (varying), debug other place than just main
- RTT framebuffer picker (need float picker)
- shader printValue usage on "variable from user" (variable/computation context not easy to explain)
- capture and zoom on pixel from framebuffers

- parse GLSL into a tree and use it for analysis like the preprocessor function shaking
		- allow for better variable selection/debug

- More RenderDOC features
   - tree of calls (each draw + state inspector)		
   - frame timeline (prepass (special framebuff), pass color framebuffe, postproc (quad or single tri render))


