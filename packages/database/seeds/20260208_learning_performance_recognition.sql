-- ============================================================
-- SEED DATA: Learning, Performance, Recognition
-- For demo environment with 150 employees
-- ============================================================

-- Get organization ID
DO $$
DECLARE
  org_id UUID;
  admin_user_id UUID;
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
  user5_id UUID;
  course1_id UUID;
  course2_id UUID;
  course3_id UUID;
  course4_id UUID;
  lesson1_id UUID;
  lesson2_id UUID;
  lesson3_id UUID;
  badge1_id UUID;
  badge2_id UUID;
  badge3_id UUID;
  badge4_id UUID;
  badge5_id UUID;
  award1_id UUID;
  award2_id UUID;
  review_id UUID;
  goal_id UUID;
BEGIN
  -- Get the first organization
  SELECT id INTO org_id FROM organizations LIMIT 1;

  IF org_id IS NULL THEN
    RAISE NOTICE 'No organization found, skipping seed';
    RETURN;
  END IF;

  -- Get some user IDs
  SELECT id INTO admin_user_id FROM users WHERE organization_id = org_id AND role = 'admin' LIMIT 1;
  SELECT id INTO user1_id FROM users WHERE organization_id = org_id AND role = 'worker' OFFSET 0 LIMIT 1;
  SELECT id INTO user2_id FROM users WHERE organization_id = org_id AND role = 'worker' OFFSET 1 LIMIT 1;
  SELECT id INTO user3_id FROM users WHERE organization_id = org_id AND role = 'worker' OFFSET 2 LIMIT 1;
  SELECT id INTO user4_id FROM users WHERE organization_id = org_id AND role = 'manager' OFFSET 0 LIMIT 1;
  SELECT id INTO user5_id FROM users WHERE organization_id = org_id AND role = 'worker' OFFSET 3 LIMIT 1;

  -- ============================================================
  -- LEARNING SEED DATA
  -- ============================================================

  -- Course 1: Health & Safety
  INSERT INTO courses (id, organization_id, title, description, category, difficulty, duration_minutes, passing_score, is_mandatory, status, created_by)
  VALUES (gen_random_uuid(), org_id, 'Workplace Health & Safety Essentials', 'Comprehensive training on workplace safety procedures, emergency protocols, and risk assessment. Required for all employees.', 'health_safety', 'beginner', 45, 80, true, 'published', admin_user_id)
  RETURNING id INTO course1_id;

  -- Lessons for Course 1
  INSERT INTO lessons (id, course_id, title, description, content_type, content_text, sort_order, duration_minutes)
  VALUES (gen_random_uuid(), course1_id, 'Introduction to Workplace Safety', 'Overview of health and safety regulations and your responsibilities', 'document', 'Health and safety at work is everyones responsibility. This module covers the basics of UK Health and Safety legislation including the Health and Safety at Work Act 1974.', 1, 10)
  RETURNING id INTO lesson1_id;

  INSERT INTO lessons (course_id, title, description, content_type, content_text, sort_order, duration_minutes)
  VALUES
    (course1_id, 'Fire Safety and Evacuation', 'Understanding fire hazards, prevention, and evacuation procedures', 'video', 'Video content covering fire safety protocols', 2, 15),
    (course1_id, 'Manual Handling', 'Safe lifting techniques and ergonomic practices', 'interactive', 'Interactive demonstration of safe lifting', 3, 10);

  INSERT INTO lessons (id, course_id, title, description, content_type, sort_order, duration_minutes)
  VALUES (gen_random_uuid(), course1_id, 'Health & Safety Quiz', 'Test your knowledge', 'quiz', 4, 10)
  RETURNING id INTO lesson2_id;

  -- Quiz questions
  INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, points, sort_order)
  VALUES
    (lesson2_id, 'What year was the Health and Safety at Work Act introduced?', 'multiple_choice', '["1970", "1974", "1980", "1985"]', '1974', 10, 1),
    (lesson2_id, 'Fire extinguishers should be checked annually.', 'true_false', '["True", "False"]', 'True', 10, 2),
    (lesson2_id, 'When lifting heavy objects, you should bend your back, not your knees.', 'true_false', '["True", "False"]', 'False', 10, 3),
    (lesson2_id, 'Who is responsible for workplace safety?', 'multiple_choice', '["Only the employer", "Only employees", "Both employers and employees", "The government"]', 'Both employers and employees', 10, 4);

  -- Course 2: GDPR Compliance
  INSERT INTO courses (id, organization_id, title, description, category, difficulty, duration_minutes, passing_score, is_mandatory, status, created_by)
  VALUES (gen_random_uuid(), org_id, 'GDPR and Data Protection', 'Understanding data protection regulations and best practices for handling personal data in the workplace.', 'compliance', 'intermediate', 60, 75, true, 'published', admin_user_id)
  RETURNING id INTO course2_id;

  INSERT INTO lessons (course_id, title, description, content_type, content_text, sort_order, duration_minutes)
  VALUES
    (course2_id, 'What is GDPR?', 'Introduction to the General Data Protection Regulation', 'document', 'GDPR is a regulation that requires businesses to protect personal data and privacy of EU citizens.', 1, 15),
    (course2_id, 'Data Subject Rights', 'Understanding the rights of individuals under GDPR', 'document', 'Individuals have rights including access, rectification, erasure, and portability of their data.', 2, 15),
    (course2_id, 'Data Breach Procedures', 'What to do in case of a data breach', 'video', 'Video explaining breach notification requirements', 3, 15),
    (course2_id, 'GDPR Assessment', 'Test your GDPR knowledge', 'quiz', 4, 15);

  -- Course 3: Leadership Development
  INSERT INTO courses (id, organization_id, title, description, category, difficulty, duration_minutes, passing_score, is_mandatory, status, created_by)
  VALUES (gen_random_uuid(), org_id, 'Leadership Fundamentals', 'Develop essential leadership skills including communication, delegation, and team motivation.', 'leadership', 'advanced', 90, 70, false, 'published', admin_user_id)
  RETURNING id INTO course3_id;

  INSERT INTO lessons (course_id, title, description, content_type, content_text, sort_order, duration_minutes)
  VALUES
    (course3_id, 'Communication Styles', 'Understanding different communication approaches', 'document', 'Effective leaders adapt their communication style to their audience.', 1, 20),
    (course3_id, 'Delegation Strategies', 'How to delegate effectively', 'video', 'Video on delegation best practices', 2, 25),
    (course3_id, 'Motivating Your Team', 'Techniques for team motivation', 'interactive', 'Interactive scenarios on motivation', 3, 25),
    (course3_id, 'Leadership Assessment', 'Apply your learning', 'quiz', 4, 20);

  -- Course 4: Customer Service Excellence
  INSERT INTO courses (id, organization_id, title, description, category, difficulty, duration_minutes, passing_score, is_mandatory, status, created_by)
  VALUES (gen_random_uuid(), org_id, 'Customer Service Excellence', 'Master the art of exceptional customer service with practical techniques for handling any situation.', 'skills', 'beginner', 40, 70, false, 'published', admin_user_id)
  RETURNING id INTO course4_id;

  INSERT INTO lessons (course_id, title, description, content_type, content_text, sort_order, duration_minutes)
  VALUES
    (course4_id, 'First Impressions', 'Creating positive customer experiences', 'document', 'First impressions are formed in seconds and can make or break a customer relationship.', 1, 10),
    (course4_id, 'Handling Complaints', 'Turning unhappy customers into loyal ones', 'video', 'Video demonstrations of complaint handling', 2, 15),
    (course4_id, 'Going Above and Beyond', 'Exceeding customer expectations', 'interactive', 'Interactive examples of exceptional service', 3, 15);

  -- Create enrollments
  IF user1_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, status, enrolled_at, started_at, completed_at, score, due_date)
    VALUES
      (user1_id, course1_id, 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days', 95, NOW() - INTERVAL '20 days'),
      (user1_id, course2_id, 'in_progress', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NULL, NULL, NOW() + INTERVAL '20 days');
  END IF;

  IF user2_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, status, enrolled_at, started_at, completed_at, score, due_date)
    VALUES
      (user2_id, course1_id, 'completed', NOW() - INTERVAL '45 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '38 days', 88, NOW() - INTERVAL '30 days'),
      (user2_id, course4_id, 'enrolled', NOW() - INTERVAL '5 days', NULL, NULL, NULL, NOW() + INTERVAL '25 days');
  END IF;

  IF user3_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, status, enrolled_at, due_date)
    VALUES
      (user3_id, course1_id, 'enrolled', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days'),
      (user3_id, course2_id, 'enrolled', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days');
  END IF;

  IF user4_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, status, enrolled_at, started_at, completed_at, score)
    VALUES
      (user4_id, course1_id, 'completed', NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days', NOW() - INTERVAL '55 days', 100),
      (user4_id, course3_id, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days', 85);
  END IF;

  -- Create certifications
  IF user1_id IS NOT NULL THEN
    INSERT INTO certifications (user_id, course_id, organization_id, certification_name, issuing_body, issue_date, expiry_date, status, verification_code)
    VALUES
      (user1_id, course1_id, org_id, 'Health & Safety Certified', 'Uplift Learning', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '340 days', 'active', 'CERT-HS-' || substr(md5(random()::text), 1, 8));
  END IF;

  IF user2_id IS NOT NULL THEN
    INSERT INTO certifications (user_id, course_id, organization_id, certification_name, issuing_body, issue_date, expiry_date, status, verification_code)
    VALUES
      (user2_id, course1_id, org_id, 'Health & Safety Certified', 'Uplift Learning', CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE + INTERVAL '327 days', 'active', 'CERT-HS-' || substr(md5(random()::text), 1, 8));
  END IF;

  IF user4_id IS NOT NULL THEN
    INSERT INTO certifications (user_id, course_id, organization_id, certification_name, issuing_body, issue_date, expiry_date, status, verification_code)
    VALUES
      (user4_id, course1_id, org_id, 'Health & Safety Certified', 'Uplift Learning', CURRENT_DATE - INTERVAL '55 days', CURRENT_DATE + INTERVAL '310 days', 'active', 'CERT-HS-' || substr(md5(random()::text), 1, 8)),
      (user4_id, course3_id, org_id, 'Leadership Fundamentals', 'Uplift Learning', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '355 days', 'active', 'CERT-LD-' || substr(md5(random()::text), 1, 8));
  END IF;

  -- ============================================================
  -- PERFORMANCE SEED DATA
  -- ============================================================

  -- Get employee IDs
  IF user1_id IS NOT NULL THEN
    -- Create performance reviews
    INSERT INTO performance_reviews (id, organization_id, employee_id, reviewer_id, review_period, type, status, self_assessment_text, manager_assessment_text, overall_rating, strengths, development_areas, completed_at)
    SELECT gen_random_uuid(), org_id, e.id, user4_id, 'Annual 2025', 'annual', 'complete',
      'I have made significant progress this year, completing all major projects on time and mentoring two new team members.',
      'Excellent performance this year. Consistently exceeded targets and showed great leadership potential.',
      4, 'Strong communication, problem-solving, teamwork', 'Could develop more strategic thinking skills', NOW() - INTERVAL '45 days'
    FROM employees e WHERE e.user_id = user1_id
    RETURNING id INTO review_id;

    -- Add competency ratings
    IF review_id IS NOT NULL THEN
      INSERT INTO competency_ratings (review_id, competency_name, competency_category, self_rating, manager_rating, comments)
      VALUES
        (review_id, 'Communication', 'core', 4, 4, 'Excellent written and verbal communication'),
        (review_id, 'Teamwork', 'core', 5, 4, 'Great collaborator, always willing to help'),
        (review_id, 'Problem Solving', 'core', 4, 4, 'Good analytical skills'),
        (review_id, 'Technical Skills', 'role_specific', 4, 4, 'Strong technical foundation'),
        (review_id, 'Initiative', 'core', 4, 5, 'Proactively identifies improvements');
    END IF;

    -- Create goals
    INSERT INTO goals (id, employee_id, organization_id, title, description, category, status, priority, target_date, progress_percentage, created_by)
    SELECT gen_random_uuid(), e.id, org_id, 'Complete Advanced Leadership Course', 'Enroll in and complete the Leadership Fundamentals course to prepare for team lead role', 'development', 'in_progress', 'high', CURRENT_DATE + INTERVAL '60 days', 40, user4_id
    FROM employees e WHERE e.user_id = user1_id
    RETURNING id INTO goal_id;

    IF goal_id IS NOT NULL THEN
      INSERT INTO goal_updates (goal_id, update_text, progress_percentage, updated_by)
      VALUES
        (goal_id, 'Started the course, completed first two modules', 20, user1_id),
        (goal_id, 'Completed communication section, great insights on adapting styles', 40, user1_id);
    END IF;

    INSERT INTO goals (employee_id, organization_id, title, description, category, status, priority, target_date, progress_percentage, created_by)
    SELECT e.id, org_id, 'Achieve 95% Customer Satisfaction', 'Maintain customer satisfaction score above 95% for Q1 2026', 'performance', 'in_progress', 'high', CURRENT_DATE + INTERVAL '30 days', 92, user4_id
    FROM employees e WHERE e.user_id = user1_id;
  END IF;

  IF user2_id IS NOT NULL THEN
    INSERT INTO goals (employee_id, organization_id, title, description, category, status, priority, target_date, progress_percentage, created_by)
    SELECT e.id, org_id, 'Complete GDPR Training', 'Finish mandatory GDPR compliance training', 'performance', 'not_started', 'high', CURRENT_DATE + INTERVAL '14 days', 0, user4_id
    FROM employees e WHERE e.user_id = user2_id;

    INSERT INTO goals (employee_id, organization_id, title, description, category, status, priority, target_date, completed_date, progress_percentage, created_by)
    SELECT e.id, org_id, 'Reduce Average Handle Time', 'Reduce average customer call handle time by 15%', 'performance', 'completed', 'medium', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '12 days', 100, user4_id
    FROM employees e WHERE e.user_id = user2_id;
  END IF;

  -- Create feedback
  IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
    INSERT INTO feedback (organization_id, from_user_id, to_user_id, feedback_text, feedback_type, is_anonymous, visibility)
    VALUES
      (org_id, user2_id, user1_id, 'Really appreciated your help with the difficult customer case yesterday. Your patience and expertise made all the difference!', 'praise', false, 'shared_with_manager'),
      (org_id, user4_id, user1_id, 'Great presentation in the team meeting. Your ideas for process improvement were well thought out.', 'praise', false, 'private');
  END IF;

  IF user1_id IS NOT NULL AND user3_id IS NOT NULL THEN
    INSERT INTO feedback (organization_id, from_user_id, to_user_id, feedback_text, feedback_type, is_anonymous, visibility)
    VALUES
      (org_id, user1_id, user3_id, 'Consider documenting your solutions so others can learn from your approach. Would be really valuable for the team.', 'constructive', false, 'private');
  END IF;

  -- ============================================================
  -- RECOGNITION SEED DATA
  -- ============================================================

  -- Create badges
  INSERT INTO badges (id, organization_id, name, description, icon_url, category, points_value, is_active, created_by)
  VALUES
    (gen_random_uuid(), org_id, 'Welcome Aboard', 'Successfully completed onboarding', '/badges/welcome.png', 'milestone', 25, true, admin_user_id)
  RETURNING id INTO badge1_id;

  INSERT INTO badges (id, organization_id, name, description, icon_url, category, points_value, is_active, created_by)
  VALUES
    (gen_random_uuid(), org_id, 'Team Player', 'Recognized for exceptional teamwork', '/badges/teamwork.png', 'achievement', 50, true, admin_user_id)
  RETURNING id INTO badge2_id;

  INSERT INTO badges (id, organization_id, name, description, icon_url, category, points_value, is_active, created_by)
  VALUES
    (gen_random_uuid(), org_id, 'Customer Champion', 'Achieved 100% customer satisfaction for a month', '/badges/champion.png', 'achievement', 75, true, admin_user_id)
  RETURNING id INTO badge3_id;

  INSERT INTO badges (id, organization_id, name, description, icon_url, category, points_value, is_active, created_by)
  VALUES
    (gen_random_uuid(), org_id, 'Safety First', 'Completed all health and safety training', '/badges/safety.png', 'skill', 30, true, admin_user_id)
  RETURNING id INTO badge4_id;

  INSERT INTO badges (id, organization_id, name, description, icon_url, category, points_value, is_active, created_by)
  VALUES
    (gen_random_uuid(), org_id, 'Innovation Star', 'Submitted an implemented improvement idea', '/badges/innovation.png', 'achievement', 100, true, admin_user_id)
  RETURNING id INTO badge5_id;

  -- Award badges to users
  IF user1_id IS NOT NULL AND badge1_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_by, awarded_reason, awarded_at)
    VALUES
      (user1_id, badge1_id, admin_user_id, 'Welcome to the team!', NOW() - INTERVAL '90 days'),
      (user1_id, badge2_id, user4_id, 'Outstanding collaboration on the Q4 project', NOW() - INTERVAL '30 days'),
      (user1_id, badge4_id, admin_user_id, 'Completed Health & Safety training with distinction', NOW() - INTERVAL '25 days');
  END IF;

  IF user2_id IS NOT NULL AND badge1_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_by, awarded_reason, awarded_at)
    VALUES
      (user2_id, badge1_id, admin_user_id, 'Welcome to the team!', NOW() - INTERVAL '95 days'),
      (user2_id, badge3_id, user4_id, 'Perfect customer satisfaction scores in January', NOW() - INTERVAL '7 days'),
      (user2_id, badge4_id, admin_user_id, 'Completed Health & Safety training', NOW() - INTERVAL '38 days');
  END IF;

  IF user4_id IS NOT NULL AND badge1_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_by, awarded_reason, awarded_at)
    VALUES
      (user4_id, badge1_id, admin_user_id, 'Welcome to management!', NOW() - INTERVAL '180 days'),
      (user4_id, badge2_id, admin_user_id, 'Building a high-performing team', NOW() - INTERVAL '60 days'),
      (user4_id, badge4_id, admin_user_id, 'Completed all safety certifications', NOW() - INTERVAL '55 days'),
      (user4_id, badge5_id, admin_user_id, 'Implemented new shift scheduling process', NOW() - INTERVAL '20 days');
  END IF;

  -- Create awards
  INSERT INTO awards (id, organization_id, name, description, award_type, prize_description, prize_value, nomination_required, is_active)
  VALUES
    (gen_random_uuid(), org_id, 'Employee of the Month', 'Recognition for outstanding performance and contribution during the month', 'monthly', 'Gift voucher and prime parking spot', 50.00, true, true)
  RETURNING id INTO award1_id;

  INSERT INTO awards (id, organization_id, name, description, award_type, prize_description, prize_value, nomination_required, is_active)
  VALUES
    (gen_random_uuid(), org_id, 'Quarterly Star', 'Best overall performer of the quarter', 'quarterly', 'Bonus payment and certificate', 200.00, true, true)
  RETURNING id INTO award2_id;

  -- Create nominations
  IF user1_id IS NOT NULL AND user2_id IS NOT NULL AND award1_id IS NOT NULL THEN
    INSERT INTO award_nominations (award_id, nominee_user_id, nominator_user_id, nomination_reason, status, period)
    VALUES
      (award1_id, user1_id, user2_id, 'Went above and beyond to help the team during a critical deadline. Worked extra hours and maintained positive attitude throughout.', 'pending', 'February 2026'),
      (award1_id, user2_id, user1_id, 'Exceptional customer service, received multiple positive customer reviews this month.', 'pending', 'February 2026');
  END IF;

  IF user1_id IS NOT NULL AND user4_id IS NOT NULL AND award1_id IS NOT NULL THEN
    -- Past winner
    INSERT INTO award_winners (award_id, winner_user_id, period, announcement_text, announced_by, announced_at)
    VALUES
      (award1_id, user1_id, 'January 2026', 'Congratulations to our Employee of the Month! Outstanding dedication and teamwork throughout the month.', admin_user_id, NOW() - INTERVAL '7 days');
  END IF;

  -- Create recognitions (kudos)
  IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
    INSERT INTO recognitions (organization_id, from_user_id, to_user_id, message, category, points_awarded, is_public, created_at)
    VALUES
      (org_id, user2_id, user1_id, 'Thanks for staying late to help me with that tricky system issue. You really saved the day! 🙌', 'going_extra_mile', 25, true, NOW() - INTERVAL '3 days'),
      (org_id, user1_id, user2_id, 'Great job handling that difficult customer call. Your patience was impressive!', 'customer_service', 15, true, NOW() - INTERVAL '5 days');
  END IF;

  IF user4_id IS NOT NULL AND user1_id IS NOT NULL THEN
    INSERT INTO recognitions (organization_id, from_user_id, to_user_id, message, category, points_awarded, is_public, created_at)
    VALUES
      (org_id, user4_id, user1_id, 'Excellent leadership during the team project. You kept everyone focused and motivated.', 'leadership', 20, true, NOW() - INTERVAL '10 days');
  END IF;

  IF user3_id IS NOT NULL AND user2_id IS NOT NULL THEN
    INSERT INTO recognitions (organization_id, from_user_id, to_user_id, message, category, points_awarded, is_public, created_at)
    VALUES
      (org_id, user3_id, user2_id, 'Thank you for showing me the ropes on my first week. Your guidance made all the difference!', 'mentorship', 20, true, NOW() - INTERVAL '1 day');
  END IF;

  -- Initialize recognition points
  IF user1_id IS NOT NULL THEN
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total, level)
    VALUES (user1_id, org_id, 195, 195, 2)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET points_balance = 195, points_earned_total = 195, level = 2;
  END IF;

  IF user2_id IS NOT NULL THEN
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total, level)
    VALUES (user2_id, org_id, 190, 190, 2)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET points_balance = 190, points_earned_total = 190, level = 2;
  END IF;

  IF user4_id IS NOT NULL THEN
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total, level)
    VALUES (user4_id, org_id, 255, 255, 3)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET points_balance = 255, points_earned_total = 255, level = 3;
  END IF;

  RAISE NOTICE 'Seed data for Learning, Performance, Recognition modules created successfully';
END $$;
