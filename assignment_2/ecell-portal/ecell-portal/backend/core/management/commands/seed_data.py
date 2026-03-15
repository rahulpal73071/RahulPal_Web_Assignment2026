"""
Management command: python manage.py seed_data
Creates initial OC superuser + sample departments + demo users.
Run ONCE after migrations in development.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Seed initial data: OC user, departments, demo users"

    def add_arguments(self, parser):
        parser.add_argument("--oc-email", default="oc@ecell.in")
        parser.add_argument("--oc-password", default="OC@secure2024!")
        parser.add_argument("--demo", action="store_true", help="Also create demo users")

    @transaction.atomic
    def handle(self, *args, **options):
        from core.models import User, Department

        # ── Departments ──────────────────────────────────────────────────────
        dept_names = [
            ("Technology", "Web, App, and Infrastructure"),
            ("Marketing", "Brand, Social Media, Outreach"),
            ("Operations", "Events, Logistics, Coordination"),
            ("Finance", "Budgets, Sponsorships, Accounting"),
            ("Content", "Newsletters, Blogs, Media"),
        ]
        depts = {}
        for name, desc in dept_names:
            dept, created = Department.objects.get_or_create(name=name, defaults={"description": desc})
            depts[name] = dept
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✓ Department: {name}"))

        # ── OC user ──────────────────────────────────────────────────────────
        oc_email = options["oc_email"]
        oc_pw = options["oc_password"]
        if not User.objects.filter(email=oc_email).exists():
            User.objects.create_user(
                email=oc_email,
                password=oc_pw,
                full_name="E-Cell OC Lead",
                role="OC",
                is_staff=True,
                is_superuser=True,
            )
            self.stdout.write(self.style.SUCCESS(f"  ✓ OC user: {oc_email} (pw: {oc_pw})"))
        else:
            self.stdout.write(f"  - OC user already exists: {oc_email}")

        if not options["demo"]:
            self.stdout.write(self.style.SUCCESS("\nSeed complete. Run with --demo to add demo users."))
            return

        # ── Demo users ────────────────────────────────────────────────────────
        demo_users = [
            ("manager.tech@ecell.in", "Manager123!", "Tech Manager", "MANAGER", "Technology"),
            ("coordinator.tech@ecell.in", "Coord123!", "Tech Coordinator", "COORDINATOR", "Technology"),
            ("manager.mkt@ecell.in", "Manager123!", "Marketing Manager", "MANAGER", "Marketing"),
            ("user1@ecell.in", "User1234!", "Rahul Sharma", "USER", None),
            ("user2@ecell.in", "User1234!", "Priya Patel", "USER", None),
            ("user3@ecell.in", "User1234!", "Arjun Mehta", "USER", None),
        ]
        for email, pw, name, role, dept_name in demo_users:
            if not User.objects.filter(email=email).exists():
                dept = depts.get(dept_name) if dept_name else None
                User.objects.create_user(
                    email=email, password=pw, full_name=name,
                    role=role, department=dept,
                )
                self.stdout.write(self.style.SUCCESS(f"  ✓ {role}: {email}"))

        # ── Sample tickets ────────────────────────────────────────────────────
        from core.models import Ticket
        user1 = User.objects.filter(email="user1@ecell.in").first()
        tech_dept = depts.get("Technology")
        if user1 and tech_dept and not Ticket.objects.filter(creator=user1).exists():
            Ticket.objects.create(
                title="Payment gateway not responding on checkout",
                description="During E-Summit registration, the Razorpay payment gateway returns a 502 error for ~30% of users. Issue started 2 hours ago. Browser: Chrome 125. Reproducible steps: go to /register → fill form → click Pay.",
                priority="CRITICAL",
                status="OPEN",
                creator=user1,
                department=tech_dept,
                tags=["payment", "production", "urgent"],
            )
            Ticket.objects.create(
                title="Mobile app login page layout broken on iOS 17",
                description="The login button overlaps the password field on iPhone 15 Pro. Tested with iOS 17.4. Not reproducible on Android.",
                priority="HIGH",
                status="OPEN",
                creator=user1,
                department=tech_dept,
                tags=["mobile", "ios", "ui"],
            )
            self.stdout.write(self.style.SUCCESS("  ✓ Sample tickets created"))

        self.stdout.write(self.style.SUCCESS("\n✅ Seed complete!"))
        self.stdout.write("\nLogin credentials:")
        self.stdout.write(f"  OC:          {oc_email} / {oc_pw}")
        self.stdout.write("  Manager:     manager.tech@ecell.in / Manager123!")
        self.stdout.write("  Coordinator: coordinator.tech@ecell.in / Coord123!")
        self.stdout.write("  User:        user1@ecell.in / User1234!")
