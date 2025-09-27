from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

class CustomAccountAdapter(DefaultAccountAdapter):
    # You can override methods here if you need custom account logic
    pass

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    # You can override methods here if you need custom social account logic
    pass 