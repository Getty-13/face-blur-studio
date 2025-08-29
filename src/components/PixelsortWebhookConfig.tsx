import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface PixelsortWebhookConfigProps {
  onWebhookConfigured: (webhookUrl: string) => void;
}

export const PixelsortWebhookConfig: React.FC<PixelsortWebhookConfigProps> = ({ onWebhookConfigured }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Zapier webhook URL",
        variant: "destructive",
      });
      return;
    }

    onWebhookConfigured(webhookUrl.trim());
    toast({
      title: "Webhook Configured",
      description: "Python pixelsort webhook is ready to use",
    });
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      toast({
        title: "Test Sent",
        description: "Test request sent to webhook. Check your Zap history.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not reach webhook. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Python Pixelsort Integration</CardTitle>
        <CardDescription>
          Connect a Zapier webhook to use the original Python pixelsort library for enhanced effects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Configure
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={testWebhook}
              disabled={isLoading}
            >
              Test
            </Button>
          </div>
        </form>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Create a Zap in Zapier</li>
            <li>Add "Webhooks by Zapier" as trigger</li>
            <li>Choose "Catch Hook" trigger event</li>
            <li>Copy the webhook URL here</li>
            <li>Configure Python script in Zap action</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};