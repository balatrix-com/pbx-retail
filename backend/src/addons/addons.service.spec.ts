import { AddonsService } from './addons.service';
describe('Retired add-on purchase flows',()=>{
    it('rejects new purchases and quotes instead of debiting a fallback wallet',async()=>{
        const http:any={post:jest.fn()};const service=new AddonsService(http,{} as any);
        await expect(service.purchaseAddon('tenant','monitoring',1)).rejects.toThrow('capacity subscriptions');
        await expect(service.getQuote('tenant','extension',1)).rejects.toThrow('capacity subscriptions');
        expect(http.post).not.toHaveBeenCalled();
    });
});
