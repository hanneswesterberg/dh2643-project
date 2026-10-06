from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse

def liveshows(request):
    return HttpResponse("Hello world!")