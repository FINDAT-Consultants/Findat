# FINDAT Courses, Profiles and Article Activity Upgrade

This upgrade keeps the existing FINDAT Cloud, authentication, role controls, collaboration requests, notifications, publishing workflow, Python chart studio, wallpapers and document storage.

## Added in this build

- The existing **Data Analytics Foundations** recording appears in a five-star course card.
- The protected recording poster is also used as the course and video thumbnail.
- Recordings open from a course catalogue designed to support additional course cards.
- Administrators receive a **Course Manager** for creating, editing and deleting courses and lessons.
- Each course supports a cover picture, title, description, instructor, qualifications, rating and draft/published state.
- Each lesson supports a video, thumbnail, documents, content, script, quiz questions and ordering.
- Administrators, Consultants and Clients can edit their own name, telephone, organisation, country, qualifications, job title and place of work.
- Published articles no longer appear in the Writing Desk's right-hand work list.
- Draft and returned papers display **In progress**.
- Article changes are recorded with the member's name, qualifications, date and time.
- Accepted collaborators can add comments and replies. Article updates and comments create bell notifications for the other participants.
- Preview and published contributor cards are arranged horizontally and cannot overlap.
- Contributor qualifications are abbreviated to the first three entries separated by `|`.

## Deployment order

### 1. Update Supabase Postgres and Storage policies

Open **Supabase → SQL Editor → New query** and run:

`FINDAT-COURSES-PROFILES-ARTICLE-COLLABORATION-UPGRADE.sql`

Wait for **Success**.

### 2. Verify the database

Run:

`FINDAT-COURSES-PROFILES-ARTICLE-COLLABORATION-VERIFY.sql`

Confirm that the four new tables and three RPC functions are present. The Realtime checks should return `true`.

### 3. Deploy the website

Extract the complete ZIP and deploy all extracted files to Netlify, replacing the previous deployment.

Hard-refresh the browser with **Ctrl + Shift + R**. On mobile, close and reopen the website once.

## Testing sequence

1. Open **Recorded Classes** and confirm the five-star **Data Analytics Foundations** card appears.
2. Open the card and confirm the lesson thumbnail appears before playback.
3. Log in as Administrator and open **Course Manager**.
4. Create a draft test course, add a lesson and upload a cover, video thumbnail and document.
5. Publish the course and confirm its card appears in Recordings.
6. Open the user profile and save professional details.
7. Open an in-progress collaborative article in two separate signed-in browser sessions.
8. Save a change in one session and confirm the dated change appears for the other member.
9. Add a comment and reply, then confirm the bell count updates.
10. Preview the paper and confirm contributor photos, names and qualifications are horizontally spaced.

## Security notes

- Course creation and course-media writes are restricted to active Administrators by Postgres RLS and Storage policies.
- Public users can read only published courses and published lessons.
- Ordinary FINDAT Cloud document paths retain their existing storage behaviour.
- Profile pictures remain restricted to the signed-in user's own avatar path.
- Article activity and comments are visible only to people who can access the article.

No additional Edge Function is required.
