-- FINDAT attention fixes: built-in course thumbnail metadata
begin;

update public.findat_courses
set cover_url = 'Classes/Data-Thumbnail.jpg',
    rating = 5.0,
    updated_at = now()
where slug = 'data-analytics-foundations';

update public.findat_course_lessons
set thumbnail_url = 'Classes/Data-Thumbnail.jpg',
    updated_at = now()
where id = '22222222-2222-4222-8222-222222222222'::uuid
   or (course_id = (select id from public.findat_courses where slug = 'data-analytics-foundations')
       and lower(title) = lower('How Data Analytics Work per Domain'));

commit;
