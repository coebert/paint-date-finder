REVOKE ALL ON FUNCTION public.job_begin(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_end(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_pause(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_resume(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.job_resume(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_begin(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.job_end(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.job_pause(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.job_resume(text) TO service_role;